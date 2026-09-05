export class Audiences {
    constructor(http) {
        this.http = http;
    }
    /** Create an audience. */
    async create(options) {
        return this.http.request("POST", "/v1/audiences", { name: options.name });
    }
    /** List audiences with contact counts. */
    async list() {
        return this.http.request("GET", "/v1/audiences");
    }
    /** Add a contact to an audience. */
    async addContact(audienceId, options) {
        return this.http.request("POST", `/v1/audiences/${audienceId}/contacts`, {
            email: options.email,
            first_name: options.firstName,
            last_name: options.lastName,
        });
    }
    /** List contacts in an audience. */
    async listContacts(audienceId) {
        return this.http.request("GET", `/v1/audiences/${audienceId}/contacts`);
    }
}
