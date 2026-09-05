import type { Http } from "../http.js";
import type { AddContactOptions, Audience, Contact } from "../types.js";
export declare class Audiences {
    private http;
    constructor(http: Http);
    /** Create an audience. */
    create(options: {
        name: string;
    }): Promise<Audience>;
    /** List audiences with contact counts. */
    list(): Promise<{
        data: Audience[];
    }>;
    /** Add a contact to an audience. */
    addContact(audienceId: string, options: AddContactOptions): Promise<Contact>;
    /** List contacts in an audience. */
    listContacts(audienceId: string): Promise<{
        data: Contact[];
    }>;
}
