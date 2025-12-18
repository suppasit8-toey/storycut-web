/**
 * StoryCut V2 - Main Entry Point
 * 
 * Handles HTTP requests (doGet, doPost) and routes them to the appropriate controller.
 */

function doGet(e) {
  // Useful for keeping the web app 'alive' or simple checks
  return ContentService.createTextOutput("StoryCut API is active.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait for up to 10 seconds for other processes to finish.
  try {
    lock.waitLock(10000); 
  } catch (e) {
    return createErrorResponse("Server is busy, please try again.");
  }

  try {
    if (!e.postData || !e.postData.contents) {
      return createErrorResponse("Invalid payload.");
    }

    var request = JSON.parse(e.postData.contents);
    var action = request.action;
    var payload = request.payload;
    var result;

    switch (action) {
      // Customer Actions
      case "getInitialData": 
        result = CustomerController.getInitialData();
        break;
      case "getBarberAvailability":
        result = CustomerController.getBarberAvailability(payload);
        break;
      case "createBooking":
        result = CustomerController.createBooking(payload);
        break;
      
      // Admin Actions
      case "getAdminBookings":
        result = AdminController.getBookings(payload);
        break;
      case "updateBookingStatus":
        result = AdminController.updateStatus(payload);
        break;
        
      default:
        return createErrorResponse("Unknown action: " + action);
    }

    return createSuccessResponse(result);

  } catch (error) {
    return createErrorResponse(error.toString());
  } finally {
    lock.releaseLock();
  }
}

// --- Helper Utilities ---

function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}
