import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Generates a random 6-character alphanumeric string (A-Z, 0-9).
 */
const generateRandomId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generates a unique 6-character booking ID.
 * Checks against the 'bookings' collection to ensure uniqueness.
 */
export const generateBookingId = async (): Promise<string> => {
    let isUnique = false;
    let newId = '';

    while (!isUnique) {
        newId = generateRandomId();

        // Check if this ID already exists
        const q = query(collection(db, "bookings"), where("bookingId", "==", newId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            isUnique = true;
        }
    }

    return newId;
};
