process.env.DB_PATH = ":memory:";

import db from "../database";
import { identify } from "../identify";

beforeEach(() => {
    db.exec("DELETE FROM Contact");
});

describe("identify", () => {
    it("creates a new primary contact when no match exists", () => {
        const res = identify({ email: "a@x.com", phoneNumber: "111" });

        expect(res.contact.emails).toEqual(["a@x.com"]);
        expect(res.contact.phoneNumbers).toEqual(["111"]);
        expect(res.contact.secondaryContactIds).toEqual([]);
    });

    it("links a new contact sharing only the phone number as a secondary", () => {
        const first = identify({ email: "a@x.com", phoneNumber: "111" });
        const second = identify({ email: "b@x.com", phoneNumber: "111" });

        expect(second.contact.primaryContatctId).toBe(first.contact.primaryContatctId);
        expect(second.contact.emails).toEqual(["a@x.com", "b@x.com"]);
        expect(second.contact.secondaryContactIds).toHaveLength(1);
    });

    it("does not create a duplicate secondary for an exact repeat request", () => {
        identify({ email: "a@x.com", phoneNumber: "111" });
        const res = identify({ email: "a@x.com", phoneNumber: "111" });

        expect(res.contact.secondaryContactIds).toEqual([]);
    });

    it("merges two previously separate primary groups when a request bridges them", () => {
        const p1 = identify({ email: "a@x.com", phoneNumber: "111" });
        const p2 = identify({ email: "b@y.com", phoneNumber: "222" });
        const merged = identify({ email: "a@x.com", phoneNumber: "222" });

        // the oldest primary always wins
        expect(merged.contact.primaryContatctId).toBe(p1.contact.primaryContatctId);
        expect(merged.contact.secondaryContactIds).toContain(p2.contact.primaryContatctId);
        expect(merged.contact.emails).toEqual(expect.arrayContaining(["a@x.com", "b@y.com"]));
        expect(merged.contact.phoneNumbers).toEqual(expect.arrayContaining(["111", "222"]));
    });

    it("matches by email only and adds a new phone number as a secondary", () => {
        const first = identify({ email: "a@x.com", phoneNumber: "111" });
        const second = identify({ email: "a@x.com", phoneNumber: "999" });

        expect(second.contact.primaryContatctId).toBe(first.contact.primaryContatctId);
        expect(second.contact.phoneNumbers).toEqual(expect.arrayContaining(["111", "999"]));
    });

    it("throws when neither email nor phoneNumber is provided", () => {
        expect(() => identify({})).toThrow();
    });
});
