import db from "./database";

// ----- Type Definitions -----

export interface Contact {
    id: number;
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: "primary" | "secondary";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface IdentifyRequest {
    email?: string | null;
    phoneNumber?: string | number | null;
}

export interface IdentifyResponse {
    contact: {
        primaryContatctId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
}

// ----- Helper Functions -----

/**
 * Find all contacts matching a given email or phoneNumber.
 */
function findMatchingContacts(
    email: string | null,
    phoneNumber: string | null
): Contact[] {
    if (email && phoneNumber) {
        return db
            .prepare(
                `SELECT * FROM Contact 
         WHERE deletedAt IS NULL 
         AND (email = ? OR phoneNumber = ?) 
         ORDER BY createdAt ASC`
            )
            .all(email, phoneNumber) as Contact[];
    } else if (email) {
        return db
            .prepare(
                `SELECT * FROM Contact 
         WHERE deletedAt IS NULL 
         AND email = ? 
         ORDER BY createdAt ASC`
            )
            .all(email) as Contact[];
    } else if (phoneNumber) {
        return db
            .prepare(
                `SELECT * FROM Contact 
         WHERE deletedAt IS NULL 
         AND phoneNumber = ? 
         ORDER BY createdAt ASC`
            )
            .all(phoneNumber) as Contact[];
    }
    return [];
}

/**
 * Get the root primary contact for a given contact.
 * Follows the linkedId chain up to the root.
 */
function getPrimaryContact(contact: Contact): Contact {
    let current = contact;
    while (current.linkedId !== null) {
        const parent = db
            .prepare(`SELECT * FROM Contact WHERE id = ? AND deletedAt IS NULL`)
            .get(current.linkedId) as Contact | undefined;
        if (!parent) break;
        current = parent;
    }
    return current;
}

/**
 * Get all contacts in a linked group (primary + all secondaries).
 */
function getLinkedContacts(primaryId: number): Contact[] {
    return db
        .prepare(
            `SELECT * FROM Contact 
       WHERE deletedAt IS NULL 
       AND (id = ? OR linkedId = ?) 
       ORDER BY createdAt ASC`
        )
        .all(primaryId, primaryId) as Contact[];
}

/**
 * Create a new contact row.
 */
function createContact(
    email: string | null,
    phoneNumber: string | null,
    linkedId: number | null,
    linkPrecedence: "primary" | "secondary"
): Contact {
    const now = new Date().toISOString();
    const result = db
        .prepare(
            `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(phoneNumber, email, linkedId, linkPrecedence, now, now);

    return db
        .prepare(`SELECT * FROM Contact WHERE id = ?`)
        .get(result.lastInsertRowid) as Contact;
}

/**
 * Turn a primary contact into a secondary, linking it to a new primary.
 */
function makePrimaryIntoSecondary(
    contactId: number,
    newPrimaryId: number
): void {
    const now = new Date().toISOString();
    db.prepare(
        `UPDATE Contact 
     SET linkedId = ?, linkPrecedence = 'secondary', updatedAt = ? 
     WHERE id = ?`
    ).run(newPrimaryId, now, contactId);

    // Also update all contacts that were linked to the old primary
    db.prepare(
        `UPDATE Contact 
     SET linkedId = ?, updatedAt = ? 
     WHERE linkedId = ?`
    ).run(newPrimaryId, now, contactId);
}

/**
 * Build the consolidated response from a primary contact's group.
 */
function buildResponse(primaryId: number): IdentifyResponse {
    const allContacts = getLinkedContacts(primaryId);

    const primary = allContacts.find((c) => c.id === primaryId)!;
    const secondaries = allContacts.filter((c) => c.id !== primaryId);

    // Collect unique emails, primary's email first
    const emails: string[] = [];
    if (primary.email) emails.push(primary.email);
    for (const c of secondaries) {
        if (c.email && !emails.includes(c.email)) {
            emails.push(c.email);
        }
    }

    // Collect unique phoneNumbers, primary's phone first
    const phoneNumbers: string[] = [];
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
    for (const c of secondaries) {
        if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
            phoneNumbers.push(c.phoneNumber);
        }
    }

    return {
        contact: {
            primaryContatctId: primary.id,
            emails,
            phoneNumbers,
            secondaryContactIds: secondaries.map((c) => c.id),
        },
    };
}

// ----- Main Identify Logic -----

export function identify(request: IdentifyRequest): IdentifyResponse {
    const email = request.email ? String(request.email).trim() : null;
    const phoneNumber = request.phoneNumber
        ? String(request.phoneNumber).trim()
        : null;

    // Must have at least one of email or phoneNumber
    if (!email && !phoneNumber) {
        throw new Error("At least one of email or phoneNumber must be provided");
    }

    // Step 1: Find all contacts matching the email or phoneNumber
    const matchingContacts = findMatchingContacts(email, phoneNumber);

    // Step 2: No matches found — create a new primary contact
    if (matchingContacts.length === 0) {
        const newContact = createContact(email, phoneNumber, null, "primary");
        return buildResponse(newContact.id);
    }

    // Step 3: Find all unique primary contacts from matches
    const primaryContactsMap = new Map<number, Contact>();
    for (const contact of matchingContacts) {
        const primary = getPrimaryContact(contact);
        primaryContactsMap.set(primary.id, primary);
    }

    const primaryContacts = Array.from(primaryContactsMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // The oldest primary is THE primary
    const truePrimary = primaryContacts[0];

    // Step 4: If there are multiple primary groups, merge them
    // (turn newer primaries into secondaries of the oldest)
    for (let i = 1; i < primaryContacts.length; i++) {
        makePrimaryIntoSecondary(primaryContacts[i].id, truePrimary.id);
    }

    // Step 5: Check if the incoming request has new information
    // that needs a new secondary contact
    const allLinked = getLinkedContacts(truePrimary.id);

    const emailExists =
        !email || allLinked.some((c) => c.email === email);
    const phoneExists =
        !phoneNumber || allLinked.some((c) => c.phoneNumber === phoneNumber);

    if (!emailExists || !phoneExists) {
        createContact(email, phoneNumber, truePrimary.id, "secondary");
    }

    // Step 6: Build and return the consolidated response
    return buildResponse(truePrimary.id);
}
