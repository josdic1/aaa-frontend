// utils/timeSlots.js
export function getTimeSlots(date) {
  const d = new Date(date + "T12:00:00");
  const day = d.getDay();
  const dinnerDays = [4, 5, 6];
  const slots = [];

  // Lunch slots
  for (let h = 11; h <= 14; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 14 && m > 45) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  // Dinner slots (Thu–Sat only)
  if (dinnerDays.includes(day)) {
    for (let h = 17; h <= 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 18 && m > 45) break;
        slots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
      }
    }
  }

  return slots;
}
