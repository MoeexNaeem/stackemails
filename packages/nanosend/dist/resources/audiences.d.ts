import type { Http } from "../http.js";
import type { Contact, CreateContactOptions, List, Segment, Topic, UpdateContactOptions } from "../types.js";
/** Contacts are team-wide; address them by id or email. */
export declare class Contacts {
    private http;
    constructor(http: Http);
    create(o: CreateContactOptions): Promise<Contact>;
    get(idOrEmail: string): Promise<Contact>;
    list(params?: {
        limit?: number;
        after?: string;
        segmentId?: string;
        q?: string;
        unsubscribed?: boolean;
    }): Promise<List<Contact>>;
    update(idOrEmail: string, o: UpdateContactOptions): Promise<Contact>;
    remove(idOrEmail: string): Promise<{
        id: string;
        deleted: true;
    }>;
}
export declare class Segments {
    private http;
    constructor(http: Http);
    create(o: {
        name: string;
        description?: string;
    }): Promise<Segment>;
    list(): Promise<List<Segment>>;
    get(id: string): Promise<Segment>;
    remove(id: string): Promise<{
        id: string;
        deleted: true;
    }>;
}
export declare class Topics {
    private http;
    constructor(http: Http);
    create(o: {
        name: string;
        description?: string;
        defaultSubscription?: "opt_in" | "opt_out";
        visibility?: "public" | "private";
    }): Promise<Topic>;
    list(): Promise<List<Topic>>;
    update(id: string, o: {
        name?: string;
        description?: string;
        defaultSubscription?: "opt_in" | "opt_out";
        visibility?: "public" | "private";
    }): Promise<Topic>;
    remove(id: string): Promise<{
        id: string;
        deleted: true;
    }>;
}
/** @deprecated Use `segments` + `contacts`. Kept for v0.1 compatibility. */
export declare class Audiences {
    private http;
    constructor(http: Http);
    create(options: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
    }>;
    list(): Promise<{
        data: {
            id: string;
            name: string;
            contact_count: number;
        }[];
    }>;
    addContact(audienceId: string, options: {
        email: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{
        id: string;
        email: string;
    }>;
    listContacts(audienceId: string): Promise<{
        data: {
            id: string;
            email: string;
        }[];
    }>;
}
