/**
 * Defines the base template for a controller object for the DB interaction layer.
 * 
 * @export
 * @interface Controller
 * @template T 
 */
export
interface Controller<T> {
    /**
     * List all the entities (or scoped entities).
     * 
     * @returns {Promise<T[]>} 
     * @memberof Controller
     */
    index(): Promise<T[]>;

    /**
     * Find an entity based on the identifier, could be name or something else.
     * 
     * @param {*} identifer 
     * @returns {(Promise<T | undefined>)} 
     * @memberof Controller
     */
    find(identifer: any, payload: any): Promise<T | undefined>;

    /**
     * Find an entitiy based on it's ID, usaully the primary column.
     * 
     * @param {*} identifier 
     * @returns {(Promise<T | undefined>)} 
     * @memberof Controller
     */
    read(identifier: any): Promise<T | undefined>;

    /**
     * Creates a new entity based on the payload.
     * 
     * @param {*} payload 
     * @returns {Promise<T>} 
     * @memberof Controller
     */
    create(payload: any): Promise<T>;

    /**
     * Updates a given entity based on it's identifier and detail payload.
     * 
     * @param {*} identifier 
     * @param {*} details 
     * @returns {Promise<T>} 
     * @memberof Controller
     */
    update(identifier: any, details: any): Promise<T>;

    /**
     * Removes a given entity from the database.
     * 
     * @param {*} identitier 
     * @returns {Promise<boolean>} 
     * @memberof Controller
     */
    delete(identitier: any): Promise<boolean>;
}
