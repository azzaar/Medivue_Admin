# CalendarView Usage Guide

## Quick Start

To use the improved CalendarView component instead of the original:

### Option 1: Replace the Import (Recommended)

In `src/components/Patients/List.tsx`:

```typescript
// Change this:
import CalendarView from "./CalendarView";

// To this:
import CalendarView from "./CalendarViewImproved";
```

### Option 2: Use Both (Testing)

Keep both versions and switch between them for testing:

```typescript
import CalendarViewOriginal from "./CalendarView";
import CalendarViewImproved from "./CalendarViewImproved";

// Use improved version
const CalendarView = CalendarViewImproved;
```

---

## Feature Comparison

| Feature | Original | Improved |
|---------|----------|----------|
| Single date selection | ✅ | ✅ |
| Multi-select dates | ❌ | ✅ |
| Time picker | ❌ | ✅ |
| Doctor search/filter | ❌ | ✅ |
| Mobile drawer | ❌ | ✅ |
| Card payment type | ❌ | ✅ |
| Bank payment type | ❌ | ✅ |
| Bulk save | ❌ | ✅ |
| FAB on mobile | ❌ | ✅ |
| Doctor autocomplete | ❌ | ✅ |

---

## User Interface Walkthrough

### Header Section
```
┌─────────────────────────────────────────────────────┐
│ 📅 Patient Name                                     │
│    Visit & Payment Tracker                          │
│                                                      │
│ [Multi-select Toggle Switch]                        │
│                                                      │
│ [🔍 Filter by doctor... (autocomplete)]            │
└─────────────────────────────────────────────────────┘
```

### Calendar Section (Left)
```
┌─────────────────────────┐
│  Select Visit Date      │
│ ┌─────────────────────┐ │
│ │   < November 2025 > │ │
│ │ Mo Tu We Th Fr Sa Su│ │
│ │  1  2  3  4  5  6  7│ │
│ │  8  9 🟢10 11 12 13 │ │  🟢 = Paid
│ │ 15 16 17 🟠18 19 20 │ │  🟠 = Unpaid
│ │ 22 23 ✅24 25 26 27 │ │  ✅ = Selected
│ │ 29 30               │ │
│ └─────────────────────┘ │
│                         │
│ 🟢 Paid  🟠 Unpaid      │
│ ✅ Selected (multi-mode)│
└─────────────────────────┘
```

### Editor Section (Right / Mobile Drawer)
```
┌─────────────────────────────────────────┐
│ Monday, 24 November 2025      [✅ Paid] │
│ Add new visit and payment               │
│                                         │
│ ₹ [300]           [💳 UPI ▼]          │
│ 🕐 [10:00]         [Dr. Smith ▼]       │
│ [✅ Paid ▼]                            │
│                                         │
│ [💾 Save Visit] [🗑️ Un-visit]         │
└─────────────────────────────────────────┘
```

---

## Step-by-Step Usage

### Single Visit Entry

1. Open patient calendar (click "Visited Days" button)
2. Click a date on the calendar
3. Enter visit details:
   - **Amount**: Default is last paid amount or ₹300
   - **Payment Type**: UPI, Cash, Card, or Bank
   - **Visit Time**: Select time (default 10:00)
   - **Doctor**: Auto-filled for doctors, selectable for admin
   - **Payment Status**: Paid or Unpaid
4. Click "Save Visit"
5. Green dot appears on calendar for paid, orange for unpaid

### Multi-Visit Entry (Bulk Save)

1. Toggle **Multi-select** switch at the top
2. Click multiple dates on the calendar
   - Selected dates show ✅ icon
   - Counter shows "X dates selected"
3. On mobile: Click FAB button "Save X Visits"
4. On desktop: Editor automatically appears
5. Enter details (same for all selected dates):
   - Amount, Payment Type, Time, Doctor, Status
6. Click "Save X Visits"
7. All selected dates are marked with visit records

### Filter by Doctor (Admin Only)

1. Click the doctor search box in header
2. Type doctor name or scroll through list
3. Select doctor from autocomplete
4. Calendar updates to show only that doctor's visits
5. Summaries recalculate for filtered visits
6. Click ✕ to clear filter

### Mobile Experience

**Opening Editor:**
- Tap any date → Bottom drawer slides up

**Multi-Select:**
- Enable switch → Tap dates → FAB appears at bottom right
- Tap FAB → Drawer opens with bulk save form

**Closing Drawer:**
- Swipe down on drawer
- Tap outside drawer
- Complete the save action

---

## Payment Types

### Icons and Labels:
- 💳 **UPI**: Digital payments (Google Pay, PhonePe, etc.)
- 💵 **Cash**: Physical currency
- 💳 **Card**: Credit/Debit card payments
- 🏦 **Bank**: Direct bank transfer

---

## Understanding the Summaries

### Month Summary
Shows data for currently visible month:
- **Total Fee**: Sum of all consultation fees
- **Paid**: Total amount collected
- **Due**: Remaining amount (Fee - Paid)
- **Paid Count**: Visits with full payment
- **Unpaid Count**: Visits with pending dues

### Overall Summary
Shows lifetime data for patient:
- Same metrics as Month Summary
- **Collection Rate**: (Paid / Fee) × 100%
- Progress bar visual

### Quick Stats
- **Last Payment**: Most recent paid amount
- **Avg. Fee/Visit**: Total Fee ÷ Total Visits
- **This Month**: Visit count for current month

---

## Un-visit Operations

### Method 1: From Editor
1. Click a date with existing visit
2. Editor opens with current details
3. Click "Un-visit" button
4. Confirms and removes visit + payment

### Method 2: Global Un-visit
1. Scroll to "Un-visit by Date" section
2. Select date from date picker
3. Click "Un-visit" button
4. Removes visit without opening editor

---

## Mobile-Specific Features

### Touch Optimizations:
- **Larger tiles**: 56px height for easy tapping
- **Bottom drawer**: Easier reach on phones
- **FAB positioning**: Bottom-right for thumb access
- **Swipe gestures**: Natural mobile interaction

### Responsive Layout:
- **xs (mobile)**: Stacked forms, icon-only buttons
- **sm (tablet)**: Side-by-side fields
- **lg (desktop)**: Sticky calendar sidebar

---

## Keyboard Shortcuts (Desktop)

- **Tab**: Navigate between fields
- **Enter**: Save (when focused on form)
- **Esc**: Close drawer/dialog
- **Arrow keys**: Navigate calendar dates
- **Space**: Toggle multi-select switch (when focused)

---

## Troubleshooting

### Issue: Multi-select not working
**Solution**: Ensure the toggle switch is enabled (blue)

### Issue: Doctor filter shows no results
**Solution**:
- Clear filter and try again
- Check if doctor has any visits for this patient

### Issue: Time not saving
**Solution**:
- Ensure time field is filled (required)
- Check browser console for API errors

### Issue: Mobile drawer won't open
**Solution**:
- Tap directly on date (not in margins)
- Check if calendar is in loading state

### Issue: Can't change doctor
**Solution**:
- Doctors can only assign to themselves
- Admins can select any doctor from dropdown

---

## Best Practices

### For Admins:
1. Use doctor filter to audit specific doctor's records
2. Use multi-select for regular patients (weekly visits)
3. Always verify payment status before marking as paid
4. Use time picker for scheduling conflicts

### For Doctors:
1. Multi-select is great for monthly visits
2. Keep consistent time slots for patients
3. Use "My Invoices" to track your collections

### Data Entry Tips:
1. **Default amount**: System remembers last paid amount
2. **Bulk consistency**: Multi-select uses same details for all
3. **Status accuracy**: Mark unpaid if partial payment
4. **Time precision**: Use actual visit time for records

---

## API Integration Notes

### Backend Requirements:

The improved component expects the API to handle:

```typescript
// Visit payment record structure
{
  date: string,        // ISO date string
  fee: number,         // Amount in ₹
  paid: number,        // Paid amount
  paymentType: "cash" | "upi" | "card" | "bank",
  visitedDoctor: string,  // Doctor ID
  time: string         // HH:mm format (NEW)
}
```

### Endpoints:
- **GET** `/patients/:id/visit-payments` - List all payments
- **POST** `/patients/:id/visit-payment` - Create/update payment
- **POST** `/patients/:id/unmark-visit` - Delete payment

---

## Migration Guide

### From Original to Improved:

**Step 1**: Test improved version
```typescript
// In List.tsx
import CalendarViewImproved from "./CalendarViewImproved";
// Test with a few patients
```

**Step 2**: Update component reference
```typescript
// Change import
import CalendarView from "./CalendarViewImproved";
```

**Step 3**: Optional cleanup
```bash
# After verifying improved version works
# You can remove the old file
rm src/components/Patients/CalendarView.tsx
```

**Step 4**: Update backend
- Ensure `time` field is stored in visit-payment records
- Add support for `card` and `bank` payment types

---

## Support & Feedback

### Common Questions:

**Q: Can I select dates from different months?**
A: Yes! Navigate to another month and select more dates in multi-select mode.

**Q: What happens to time if I don't fill it?**
A: Defaults to "10:00" AM.

**Q: Can I filter by multiple doctors?**
A: Currently only single doctor filter. Use Invoice page for multi-doctor reports.

**Q: How to bulk delete visits?**
A: Currently one at a time. Bulk delete is a future enhancement.

---

**Version**: 1.0.0
**Last Updated**: November 11, 2025
**Component**: CalendarViewImproved.tsx
