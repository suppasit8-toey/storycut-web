/**
 * Services
 * 
 * Contain the core business logic and direct interactions with Sheets/Drive.
 */

var DataService = {
  getSpreadsheet: function() {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  },

  getServices: function() {
    // Expects columns: ID, Name, Duration, Price
    var sheet = this.getSpreadsheet().getSheetByName(CONFIG.SHEET_SERVICES);
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    return data.map(function(row) {
      return { id: row[0], name: row[1], duration: row[2], price: row[3] };
    });
  },

  getBarbers: function() {
    // Expects columns: ID, Name, ImageURL
    var sheet = this.getSpreadsheet().getSheetByName(CONFIG.SHEET_BARBERS);
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    return data.map(function(row) {
      return { id: row[0], name: row[1], imageUrl: row[2] };
    });
  },

  addBooking: function(booking) {
    var sheet = this.getSpreadsheet().getSheetByName(CONFIG.SHEET_BOOKINGS);
    var id = "B-" + new Date().getTime(); // Simple unique ID
    var timestamp = new Date();
    
    sheet.appendRow([
      id,
      booking.status,
      booking.date,
      booking.time,
      booking.serviceId,
      booking.barberId,
      booking.customerName,
      booking.customerPhone,
      booking.slipUrl,
      timestamp
    ]);
    return id;
  },

  getAllBookings: function() {
    var sheet = this.getSpreadsheet().getSheetByName(CONFIG.SHEET_BOOKINGS);
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    // Assuming standard column order matching addBooking
    return data.map(function(row) {
      return {
        id: row[0],
        status: row[1],
        date: Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        time: row[3],
        serviceId: row[4],
        barberId: row[5],
        customerName: row[6],
        customerPhone: row[7],
        slipUrl: row[8]
      };
    });
  },

  updateBookingStatus: function(id, status) {
    var sheet = this.getSpreadsheet().getSheetByName(CONFIG.SHEET_BOOKINGS);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        sheet.getRange(i + 1, 2).setValue(status); // Status is column 2 (index 1)
        return;
      }
    }
    throw new Error("Booking ID not found");
  }
};

var AvailabilityService = {
  getSlots: function(barberId, date, serviceId) {
    // Mock Availability Logic for simplicity
    // In production: Read existing bookings for this barber/date and service duration
    // Filter out taken slots.
    
    // Returning a static list purely for starting example
    return [
      "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"
    ];
  }
};

var FileService = {
  uploadSlip: function(base64Data, phone, date) {
    var folder = DriveApp.getFolderById(CONFIG.UPLOAD_FOLDER_ID);
    var contentType = base64Data.substring(5, base64Data.indexOf(';'));
    var bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    var blob = Utilities.newBlob(bytes, contentType, phone + "_" + date + "_slip.jpg");
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getDownloadUrl();
  }
};
