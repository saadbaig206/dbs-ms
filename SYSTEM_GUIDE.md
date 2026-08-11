# Aura Luxury Clinic - System Features & User Guide

Welcome to the newly upgraded **Aura Luxury Clinic POS & Management System**. This guide explains what the system can do in simple, non-technical terms.

---

## What is this system?

This is a comprehensive management and Point-of-Sale (POS) application built specifically for clinics and medical spas. It helps you manage clients, book appointments, track staff attendance, record monthly salary payments, manage product inventory, and checkout sales in real time.

All information is now securely stored in a cloud database (**Postgres**), meaning changes are saved instantly and will not be lost when you refresh the page.

---

## Core Modules & Features

### 1. Secure Login & Role-Based Access
- **Two Roles**: The system distinguishes between **Administrators (Admins)** and **Staff Members**.
  - **Admins** have access to the entire system, including sensitive financial metrics, reports, and settings.
  - **Staff** have access to daily operational tools, such as the POS terminal, client registration, and booking schedules, but cannot view overall business profit/loss statements or administrative expenses.
- **Security**: Ensures that only authorized users can access specific pages. Unauthenticated users are redirected back to the login page automatically.

### 2. Point-of-Sale (POS) Terminal
- **Service Cart**: Add services to a shopping cart during checkout.
- **Discounts & Taxes**: Automatically calculate subtotals, apply percentage discounts, add taxes, and compute the grand total.
- **Receipt Printing**: Generates a professional invoice that can be printed or saved for the client.
- **One-Click Updates**: Checking out automatically logs the payment, adds the transaction history to the client's file, increases their visit count, and alerts staff if any inventory items were depleted.

### 3. Client Management
- **Detailed Profiles**: Store name, phone number, CNIC, gender, age, and address.
- **Automatic History**: Every visit and service checkout is logged under the client's history.
- **Loyalty Metrics**: Instantly see how much a client has spent and how many times they have visited the clinic to offer VIP discounts.

### 4. Smart Appointments & Booking
- **Schedule Management**: Book appointments for clients with specific staff members, services, dates, and times.
- **No Overlapping Bookings**: The system has smart validation that prevents booking the same staff member for two different clients at the exact same time.

### 5. Staff Management & Smart Salaries
- **Staff Profiles**: Manage names, roles (e.g. Dermatologist, Receptionist), phone numbers, status (Active/On Leave/Inactive), and ratings.
- **Salary Automation**: Whenever an active staff member is added or updated, the system automatically creates a pending salary expense log for the current month. If they are marked as inactive or leave, the pending expense is automatically cleaned up.

### 6. Inventory Control & Low-Stock Alerts
- **Real-Time Tracking**: Track current product quantities against a minimum stock threshold.
- **Auto-Alert Status**: 
  - **In Stock**: Product quantity is healthy.
  - **Low Stock**: Product has dropped below the warning limit.
  - **Out of Stock**: Product is empty and needs restocking.

### 7. Financial Transactions & Expenses
- **Income Tracking**: View complete sales invoices, payment methods used (Cash, Card, Bank, Online), and totals.
- **Expense Log**: Track operational costs (Rent, Electric Bills, Machine maintenance, Products) to keep the clinic's ledger clean.

### 8. Dashboard Analytics
- **Live Statistics**: Displays total revenue, active staff counts, total appointments, and total client count.
- **Low Stock Alerts**: Displays alerts for items that need reordering.
- **Monthly Revenue Graphs**: Visualize sales performance over time to help you make informed business decisions.
