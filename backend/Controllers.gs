/**
 * Controllers
 * 
 * Orchestrate the flow between the API request and the Service layer.
 * These functions validate input and call the necessary business logic.
 */

var CustomerController = {
  
  /**
   * Returns initial data for the wizard (Services, Barbers).
   */
  getInitialData: function() {
    var services = DataService.getServices();
    var barbers = DataService.getBarbers();
    return {
      services: services,
      barbers: barbers
    };
  },

  /**
   * Returns available time slots for a specific barber on a specific date.
   * payload: { barberId: string, date: string (YYYY-MM-DD), serviceId: string }
   */
  getBarberAvailability: function(payload) {
    if (!payload.barberId || !payload.date || !payload.serviceId) {
      throw new Error("Missing required fields for availability check.");
    }
    return AvailabilityService.getSlots(payload.barberId, payload.date, payload.serviceId);
  },

  /**
   * Creates a new booking.
   * payload: { serviceId, barberId, date, time, customer: {name, phone}, fileData (base64) }
   */
  createBooking: function(payload) {
    // Basic Validation
    if (!payload.fileData) throw new Error("Payment slip is required.");
    if (!payload.date || !payload.time) throw new Error("Date and time are required.");

    // 1. Upload Slip
    var fileUrl = FileService.uploadSlip(payload.fileData, payload.customer.phone, payload.date);

    // 2. Create Record
    var bookingData = {
      serviceId: payload.serviceId,
      barberId: payload.barberId,
      date: payload.date,
      time: payload.time,
      customerName: payload.customer.name,
      customerPhone: payload.customer.phone,
      slipUrl: fileUrl,
      status: 'Pending'
    };

    var bookingId = DataService.addBooking(bookingData);

    return { bookingId: bookingId, status: 'Pending' };
  }
};

var AdminController = {
  getBookings: function(payload) {
    // Could add auth check here if we passed an admin token
    return DataService.getAllBookings();
  },

  updateStatus: function(payload) {
    if (!payload.bookingId || !payload.status) throw new Error("Missing bookingId or status");
    DataService.updateBookingStatus(payload.bookingId, payload.status);
    return { success: true };
  }
};
