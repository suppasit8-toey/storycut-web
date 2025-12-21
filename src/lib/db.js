import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc, orderBy, onSnapshot, deleteDoc, setDoc } from "firebase/firestore";

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

export const getBookings = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error getting bookings: ", e);
        throw e;
    }
};

export const getBookingsByBarberAndDate = async (barberId, date) => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("barberId", "==", barberId),
            where("date", "==", date)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error getting filtered bookings: ", e);
        throw e;
    }
};
export const updateBookingStatus = async (bookingId, status) => {
    try {
        const docRef = doc(db, "bookings", bookingId);
        await updateDoc(docRef, { status });
        console.log("Booking status updated to: ", status);
    } catch (e) {
        console.error("Error updating booking status: ", e);
        throw e;
    }
};
export const updateBookingExtraDetails = async (bookingId, details) => {
    try {
        const docRef = doc(db, "bookings", bookingId);
        await updateDoc(docRef, {
            extra_fee: Number(details.extraFee || 0),
            extra_note: details.extraNote || "",
            status: details.status || "confirmed"
        });
        console.log("Booking extra details updated");
    } catch (e) {
        console.error("Error updating booking extra details: ", e);
        throw e;
    }
};

export const updateService = async (serviceId, serviceData) => {
    try {
        const docRef = doc(db, "services", serviceId);
        await updateDoc(docRef, serviceData);
        console.log("Service updated");
    } catch (e) {
        console.error("Error updating service: ", e);
        throw e;
    }
};

export const deleteService = async (serviceId) => {
    try {
        await deleteDoc(doc(db, "services", serviceId));
        console.log("Service deleted");
    } catch (e) {
        console.error("Error deleting service: ", e);
        throw e;
    }
};

export const updateBarber = async (barberId, barberData) => {
    try {
        const docRef = doc(db, "barbers", barberId);
        await updateDoc(docRef, barberData);
        console.log("Barber updated");
    } catch (e) {
        console.error("Error updating barber: ", e);
        throw e;
    }
};

export const deleteBarber = async (barberId) => {
    try {
        await deleteDoc(doc(db, "barbers", barberId));
        console.log("Barber deleted");
    } catch (e) {
        console.error("Error deleting barber: ", e);
        throw e;
    }
};

// --- Barber-Service Mapping (Specialized Pricing) ---

export const getBarberServices = async (barberId) => {
    try {
        const q = query(collection(db, "barberServices"), where("barber_id", "==", barberId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error getting barber services mapping: ", e);
        throw e;
    }
};

export const getBarberPricesForService = async (serviceId) => {
    try {
        const q = query(collection(db, "barberServices"), where("service_id", "==", serviceId));
        const querySnapshot = await getDocs(q);
        const pricing = {};
        querySnapshot.forEach(doc => {
            const data = doc.data();
            pricing[data.barber_id] = {
                price_normal: data.price_normal,
                price_promo: data.price_promo
            };
        });
        return pricing;
    } catch (e) {
        console.error("Error getting prices for service: ", e);
        throw e;
    }
};

export const updateBarberService = async (barberId, serviceId, data) => {
    try {
        // Use a composite ID for simplicity: barberId_serviceId
        const mappingId = `${barberId}_${serviceId}`;
        const docRef = doc(db, "barberServices", mappingId);

        if (data.enabled) {
            await setDoc(docRef, {
                barber_id: barberId,
                service_id: serviceId,
                price_normal: Number(data.price_normal),
                price_promo: data.price_promo ? Number(data.price_promo) : null,
                commission_fixed: Number(data.commission_fixed || 0),
                promotion_text: data.promotion_text || "",
                promotion_active: Boolean(data.promotion_active),
                updatedAt: new Date()
            });
        } else {
            // If disabled, we can either delete the mapping or mark it inactive
            await deleteDoc(docRef);
        }
        console.log("Barber service mapping updated");
    } catch (e) {
        console.error("Error updating barber service mapping: ", e);
        throw e;
    }
};
