import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";

export const addBarber = async (barberData) => {
    try {
        const docRef = await addDoc(collection(db, "barbers"), barberData);
        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

export const addService = async (serviceData) => {
    try {
        const docRef = await addDoc(collection(db, "services"), serviceData);
        console.log("Service written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding service: ", e);
        throw e;
    }
};

export const getServices = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "services"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error getting services: ", e);
        throw e;
    }
};

export const getBarbers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "barbers"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error getting barbers: ", e);
        throw e;
    }
};

export const getBarberById = async (id) => {
    try {
        const docRef = doc(db, "barbers", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such barber!");
            return null;
        }
    } catch (e) {
        console.error("Error getting barber: ", e);
        throw e;
    }
};

export const addBooking = async (bookingData) => {
    try {
        const docRef = await addDoc(collection(db, "bookings"), {
            ...bookingData,
            createdAt: new Date()
        });
        console.log("Booking written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding booking: ", e);
        throw e;
    }
};
