import {v4 as uuidv4} from 'uuid';

export function generateID() {
    return uuidv4().substring(0, 8);
}
