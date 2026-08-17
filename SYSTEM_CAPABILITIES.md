# Aura Luxury Clinic Management & POS System: System Analysis

This document provides a comprehensive overview of the **Aura Luxury Clinic Management & Point-of-Sale (POS) System**, outlining its core capabilities, features it lacks, and structural elements.

---

## 1. Core Capabilities

The system is a full-stack clinic management platform built with **Next.js 16 (React 19)** on the frontend, **FastAPI (Python 3.12)** on the backend, and **PostgreSQL (Neon)** as the relational database.

### 💳 Point-of-Sale (POS) & Automated Billing
- **Interactive Cart**: Supports scanning/adding services (e.g., HydraFacial, Botox) and products to a checkout cart.
- **Taxes & Discounts**: Calculates itemized subtotals, custom discount percentages, tax percentages, and rounded grand totals.
- **Multi-Payment Methods**: Processes cash, card (capturing card type, last 4 digits), and bank transfer (capturing transaction reference IDs).
- **Invoice Generation**: Generates automated sequential invoice numbers (e.g., `INV-2026-001`) and financial transaction logs (`TXN-901`).
- **Dynamic Receipts**: Supports print-friendly layouts and invoice previews.

### 👥 Client Relationship Management (CRM)
- **Visit & Spend Tracking**: Automatically updates a client's lifetime visit count and total spent amount upon checkout.
- **Service History & Auto-Tracking**: Appends every checkout transaction details to the client's history log. It utilizes SQLAlchemy's `MutableList.as_mutable(JSON)` to automatically track array updates without requiring manual list re-assignment workarounds.
- **Assigned Staff**: Associates specific clients with preferred staff members for personalized care.

### 💼 Staff & Payroll Synced Expenses
- **Automated Expense Matching**: Creating or updating a staff member's salary automatically registers or updates a pending monthly salary expense record (`EXP-SAL-<staff_id>`).
- **Payroll Termination Cleanup**: Disabling or deleting a staff member automatically cleans up associated pending salary expense records to keep books clean.
- **Attendance Registry**: Simple check-in and check-out tracking to monitor daily hours and status (Present, Late, Absent).

### 📦 Multi-Branch Inventory Control
- **Automatic Stock Deduction**: Checking out service/product items via the POS automatically decrements the stock levels of matching products in the inventory database.
- **Low-Stock Alerts**: Generates persistent system notifications (`NOT-INV-<timestamp>`) when stock levels fall below the minimum threshold set for an item.
- **Branch-Specific Stock**: Tracks inventory separately across multiple locations.

### 🤖 WhatsApp & AI-Powered Chatbot Integration
- **Two-Way Webhook Pipeline**: Features a complete webhook verification and events receiver. Incoming customer messages are parsed in the background and routed to an AI-powered chatbot.
- **Non-Blocking Message Dispatch**: Meta Graph API and Groq LLM network calls are executed inside FastAPI's `BackgroundTasks`, preventing third-party latency from blocking client requests.
- **Context-Aware LLM**: Integrated with Groq API (`llama-3.3-70b-versatile`) to generate customer replies based on a customizable prompt and knowledge base.
- **Multi-Branch Configurations**: WhatsApp settings are scoped by `branch_id`. Different branches can manage distinct AI prompts and knowledge bases, and incoming messages resolve to their respective branch configs.

### 🔒 Enforced Tenant / Branch Scoping
- **Centralized Dependency**: Utilizes `get_user_branch_id` to enforce branch scoping at the API level. Staff accounts are strictly isolated to their branch data, while admins can switch branches dynamically using headers or query parameters.

---

## 2. Lacking Features (Functional Gaps)

While the system covers essential operations, it has the following limitations:

### 📅 Advanced Appointment & Resource Scheduling
- **No Conflict Prevention**: The system allows double-booking the same practitioner or room at identical time slots; there is no validation to enforce schedule uniqueness.
- **No Clinic Capacity Constraints**: Does not restrict appointments based on operating hours or room availability.

### 🛍️ Comprehensive Inventory Auditing
- **No Supplier Ledger**: Stock increases are handled by manual updates. There is no purchase order (PO) workflow, supplier invoice upload, or cost-of-goods-sold (COGS) historical tracking.
- **No Stock Audit Logs**: Stock changes are not audit-trailed (e.g., who decremented/restocked, or reasons for manual stock adjustments).
