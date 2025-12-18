/**
 * Configuration & Constants
 * 
 * REPLACE these IDs with your actual Google Sheet IDs and Folder IDs.
 */

var CONFIG = {
  // ID of the Google Sheet containing all data
  SPREADSHEET_ID: "REPLACE_WITH_YOUR_SHEET_ID_HERE", 
  
  // ID of the Google Drive Folder to store uploaded slips
  UPLOAD_FOLDER_ID: "REPLACE_WITH_YOUR_FOLDER_ID_HERE",

  // Sheet Names
  SHEET_BOOKINGS: "Bookings",
  SHEET_SERVICES: "Services",
  SHEET_BARBERS: "Barbers",
  SHEET_SETTINGS: "Settings",

  // Business Rules
  SLOT_INTERVAL_MINUTES: 60, // Basic slot size
  OPEN_HOUR: 10, // 10:00 AM
  CLOSE_HOUR: 20 // 08:00 PM
};
