# 📅 Broadband Plan Expiry Date Management Guide

## Overview
The 4You Broadband Admin Portal provides comprehensive expiry date management for all user subscriptions. This guide explains all the features and how to use them.

---

## 🎯 Current Features

### 1. **Automatic Expiry Date Calculation**

When adding a new user:
- **Plan Start Date** is set (default: today's date)
- **Expiry Date** is automatically calculated: `Start Date + 1 month`
- **Payment Due Date** is set to: `Start Date + 15 days`

**Location**: Admin Portal → Broadband User List → Add New User

**Backend Logic**:
```python
# From backend/app.py:372
plan_expiry = plan_start + relativedelta(months=1)
payment_due = plan_start + timedelta(days=15)
```

---

### 2. **Visual Expiry Status Indicators**

In the User List, each user shows:

#### **Color-Coded Badges**:
- 🟢 **Active** - Plan active with > 7 days remaining
- 🟡 **Expires in Xd** - Plan expiring within 7 days (warning)
- 🔴 **Expired** - Plan has expired

**Location**: Admin Portal → Broadband User List → Status Column

**Implementation**: Lines 1229-1250 in App.jsx
```javascript
const getExpiryBadge = (user) => {
  if (!user.is_plan_active) {
    return <Badge variant="danger">Expired</Badge>;
  }

  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return <Badge variant="danger">Expired</Badge>;
  } else if (daysUntilExpiry <= 7) {
    return <Badge variant="warning">Expires in {daysUntilExpiry}d</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
}
```

---

### 3. **Plan Renewal System** ✅

#### **How to Renew a Plan**:

**API Endpoint**: `POST /api/users/{user_id}/renew`

**Request Body**:
```json
{
  "months": 1  // Number of months to extend (1-12)
}
```

**What Happens**:
1. Takes current expiry date
2. Adds specified months to it
3. Sets `is_plan_active = true`
4. Sets `status = "Active"`
5. Records `last_renewal_date`

**Backend Code** (app.py:603-634):
```python
current_expiry = datetime.strptime(user.plan_expiry_date, "%Y-%m-%d")
new_expiry = current_expiry + relativedelta(months=renewal_data.months)
user.plan_expiry_date = new_expiry.strftime("%Y-%m-%d")
user.is_plan_active = True
user.status = "Active"
```

**Note**: Currently this API exists but **there's no UI button in the frontend**. This needs to be added.

---

### 4. **Billing Adjustment (Manual Expiry Control)**

#### **How to Manually Adjust Expiry**:

**Location**: Admin Portal → Broadband User List → Select User → Billing Adjustment

**What You Can Change**:
- ✅ Plan Start Date
- ✅ Broadband Plan (changing plan affects monthly cost)
- ✅ Payment Status
- ✅ Old Pending Amount
- ✅ Payment Due Date

**Implementation**: Lines 2661-3062 in App.jsx

**Limitations**:
- ❌ Cannot directly edit expiry date (it's calculated based on start date + plan duration)
- To extend expiry, you need to use the renewal API (see #3)

---

### 5. **Automatic Expiry Checking System** ⚙️

#### **Background Service**:
The system has a `plan_expiry_checker.py` that:
- Runs periodically (can be triggered manually)
- Checks all users' expiry dates
- Updates `is_plan_active` status
- Marks expired plans

#### **Manual Trigger**:
**Location**: Admin Portal → Notifications → "Check Expired Plans" button

**API Endpoint**: `POST /api/users/check-expired-plans`

**What It Does**:
```python
# From plan_expiry_checker.py
def check_and_expire_plans():
    today = date.today()
    users = db.query(User).filter(User.is_plan_active == True).all()

    expired_count = 0
    for user in users:
        expiry_date = datetime.strptime(user.plan_expiry_date, "%Y-%m-%d").date()
        if expiry_date < today:
            user.is_plan_active = False
            user.status = "Expired"
            expired_count += 1
```

---

### 6. **Notifications Tab - Expiry Monitoring** 📧

**Location**: Admin Portal → Notifications

**Statistics Shown**:
- Total pending payments
- **Plans expiring today** (real-time count)

**Code** (Lines 4544-4548):
```javascript
const expiringToday = users.filter(u => {
  const expiryDate = new Date(u.plan_expiry_date);
  const today = new Date();
  return expiryDate.toDateString() === today.toDateString();
}).length;
```

---

## 🛠️ How to Manage Expiry Dates (Step by Step)

### **Scenario 1: Extend a Plan for a Customer**

**Option A - Using Billing Adjustment** (Change Start Date):
1. Go to **Broadband User List**
2. Click **Billing** button for the user
3. Modify **Plan Start Date** to today's date
4. Save changes
5. ⚠️ This resets the billing cycle

**Option B - Using Renewal API** (Recommended):
1. Call API: `POST /api/users/{user_id}/renew`
2. Body: `{ "months": 1 }`
3. This extends from current expiry date
4. ✅ No billing cycle disruption

**Option C - Add Renewal Button** (Needs Implementation):
Currently missing from frontend - see recommendations below

---

### **Scenario 2: Check Which Plans Are Expiring Soon**

1. Go to **Broadband User List**
2. Look at **Status** column
3. Yellow badges show "Expires in Xd"
4. Filter by payment status if needed

---

### **Scenario 3: Manually Mark Plans as Expired**

1. Go to **Notifications** tab
2. Click **"Check Expired Plans"** button
3. System scans all users
4. Updates expired plans automatically

---

## 🚀 **Recommended Improvements**

### **Missing Features to Add**:

#### 1. **Renew Plan Button** (PRIORITY HIGH)
Add a "Renew" button in the user actions menu:

```javascript
// In UsersTab component, add:
const handleRenewPlan = async (userId) => {
  // Show modal to select renewal duration
  const months = await showRenewalModal(); // 1, 3, 6, 12 months

  try {
    await api.post(`/api/users/${userId}/renew`, { months });
    showToast(`Plan renewed for ${months} months`, 'success');
    onRefresh();
  } catch (error) {
    showToast('Failed to renew plan', 'error');
  }
};

// Add button next to Edit/Delete:
<button onClick={() => handleRenewPlan(user.id)}>
  <RefreshCw className="w-4 h-4" /> Renew
</button>
```

#### 2. **Bulk Renewal** (PRIORITY MEDIUM)
Allow selecting multiple users and renewing all at once.

#### 3. **Custom Expiry Date Override** (PRIORITY LOW)
Allow admin to manually set any expiry date (not just calculated).

#### 4. **Expiry Date in Edit User Modal** (PRIORITY MEDIUM)
Show (read-only) expiry date in Edit User form for reference.

#### 5. **Expiry History** (PRIORITY LOW)
Track all renewal/expiry changes in billing history.

---

## 📊 **Database Fields**

**User Table Fields**:
- `plan_start_date` (string) - When plan started
- `plan_expiry_date` (string) - When plan expires (calculated)
- `is_plan_active` (boolean) - Active/Expired status
- `payment_due_date` (string) - When payment is due
- `last_renewal_date` (string) - Last time plan was renewed

---

## 🔧 **API Endpoints Summary**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/users` | POST | Create user (sets initial expiry) | ✅ Implemented |
| `/api/users/{id}/billing` | PUT | Update billing (can change start date) | ✅ Implemented |
| `/api/users/{id}/renew` | POST | Extend expiry by months | ✅ Backend only |
| `/api/users/check-expired-plans` | POST | Manually trigger expiry check | ✅ Implemented |

---

## ⚠️ **Important Notes**

1. **Expiry date is calculated**, not manually set during user creation
2. Changing plan start date in Billing Adjustment resets the cycle
3. Renewal extends from **current expiry**, not from today
4. The system doesn't auto-expire plans - you must trigger the check
5. No UI for plan renewal - must use API directly

---

## 🎓 **Best Practices**

1. **Regular Expiry Checks**: Run "Check Expired Plans" daily
2. **Proactive Renewals**: Renew before expiry (when status shows "Expires in Xd")
3. **Billing Adjustment**: Use only for corrections, not for renewals
4. **Monitor Notifications Tab**: Check "Expiring Today" count regularly
5. **Plan Start Date**: Set accurately during user creation

---

## 📞 **Common Questions**

**Q: Can I set a custom expiry date?**
A: No, it's always calculated as start date + plan duration. Use renewal API to extend.

**Q: What happens when a plan expires?**
A: `is_plan_active` becomes false, status changes to "Expired", user may lose access.

**Q: How do I renew multiple users at once?**
A: Currently not supported. Needs bulk renewal feature.

**Q: Can I see renewal history?**
A: Partially - billing history shows plan changes. Full renewal history tracking needs implementation.

**Q: How to prevent expiry?**
A: Set up automatic renewals or renew before expiry date.

---

## 📝 **Next Steps**

To improve expiry management, implement:
1. ✅ Renewal button in user list (highest priority)
2. ✅ Renewal modal with month selection
3. ✅ Bulk renewal feature
4. ✅ Auto-renewal option per user
5. ✅ Email notifications before expiry (integrate with notification system)

Would you like me to implement the Renewal button and modal now?
