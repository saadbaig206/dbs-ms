import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            # Minimal footer on cover page
            self.saveState()
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0f172a"))
            self.drawString(40, 35, "CONFIDENTIAL — STRICTLY FOR INTERNAL GOVERNANCE & ARCHITECTURAL REMEDIATION")
            self.restoreState()
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        # Header
        self.drawString(40, 755, "AURA LUXURY CLINIC — FINANCIAL ARCHITECTURE & SYSTEMS AUDIT REPORT")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 748, 572, 748)
        # Footer
        self.line(40, 45, 572, 45)
        self.drawString(40, 32, "Confidential — Executive, Operational & Regulatory Advisory")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 32, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    c_primary = colors.HexColor("#0f172a") # Slate 900
    c_secondary = colors.HexColor("#1e3a8a") # Blue 900
    c_accent = colors.HexColor("#2563eb") # Blue 600
    c_danger = colors.HexColor("#b91c1c") # Red 700
    c_success = colors.HexColor("#047857") # Emerald 700
    c_warning = colors.HexColor("#b45309") # Amber 700
    c_muted = colors.HexColor("#475569") # Slate 600
    c_bg_light = colors.HexColor("#f8fafc") # Slate 50
    c_border = colors.HexColor("#e2e8f0") # Slate 200

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_secondary,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_danger = ParagraphStyle(
        'CalloutDanger',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#7f1d1d")
    )

    callout_info = ParagraphStyle(
        'CalloutInfo',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e3a8a")
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0f172a")
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    td_style = ParagraphStyle(
        'TD',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )

    td_bold = ParagraphStyle(
        'TDBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # ==========================================
    # COVER / TITLE BLOCK
    # ==========================================
    story.append(Paragraph("AURA LUXURY CLINIC & POS SYSTEM", ParagraphStyle(
        'SubHeader', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=c_accent, spaceAfter=4
    )))
    story.append(Paragraph("Comprehensive Financial Architecture, Systems Audit & Implementation Blueprint", title_style))
    story.append(Paragraph("Procurement (Purchases), Intangibles & Brand Value, Partner Equity & Drawings, Revenue Treasury, Client A/R & Advance Billing", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_accent, spaceBefore=0, spaceAfter=14))

    meta_data = [
        [
            Paragraph("<b>Target System:</b> DBS-System (FastAPI / Next.js / PostgreSQL)", td_style),
            Paragraph("<b>Audit Date:</b> September 2026", td_style)
        ],
        [
            Paragraph("<b>Scope:</b> Financial Integrity, POS, Procurement, Equity & Compliance", td_style),
            Paragraph("<b>Classification:</b> Confidential Executive Advisory", td_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 262])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_light),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # EXECUTIVE SUMMARY & RISK MATRIX
    # ==========================================
    story.append(Paragraph("1. Executive Summary & Critical Risk Assessment", h1_style))
    story.append(Paragraph(
        "A rigorous architectural and codebase audit of the <b>Aura Luxury Clinic</b> application revealed that while the system "
        "features functional UI screens for checkout and expense recording, <b>it lacks the structural mechanisms of an audit-ready medical ERP</b>. "
        "The system behaves as an ephemeral cash tracker with four catastrophic failure points: historical salary expense destruction, "
        "a primary key collision halting recurring payroll, an authorization deadlock blocking vendor deletions, and permanent de-synchronization "
        "between transaction edits and client records. Furthermore, revenue is not stored in any treasury accounts, partner equity is completely missing, "
        "advance package billing is unaccounted for, and vendor returns lack debit note mechanisms.", body_style
    ))

    risk_data = [
        [Paragraph("Severity", th_style), Paragraph("Identified Vulnerability", th_style), Paragraph("Component File", th_style), Paragraph("Business & Legal Impact", th_style)],
        [
            Paragraph("<font color='#b91c1c'><b>CRITICAL (P0)</b></font>", td_style),
            Paragraph("<b>Historical Paid Salary Purge</b><br/>Deleting or setting staff inactive deletes ALL historical paid salaries.", td_style),
            Paragraph("salary.py:L54-64<br/>staff.py:L124, 141", td_style),
            Paragraph("Permanent loss of prior-year tax and operational expense records; invalidates fiscal tax returns.", td_style)
        ],
        [
            Paragraph("<font color='#b91c1c'><b>CRITICAL (P0)</b></font>", td_style),
            Paragraph("<b>Month 2+ Salary Sync DB Crash</b><br/>Hardcoded ID <code>EXP-SAL-{id}</code> causes PK collision.", td_style),
            Paragraph("salary.py:L39-50", td_style),
            Paragraph("Database crashes on recurring payroll runs as soon as Month 1 salary is paid.", td_style)
        ],
        [
            Paragraph("<font color='#b91c1c'><b>CRITICAL (P0)</b></font>", td_style),
            Paragraph("<b>Vendor Deletion Deadlock</b><br/>Endpoint requires Admin role, but code demands Partner approval.", td_style),
            Paragraph("expenses.py:L90-120<br/>deps.py:L108", td_style),
            Paragraph("Partners receive 403 Forbidden; 100% approval threshold can never be reached.", td_style)
        ],
        [
            Paragraph("<font color='#d97706'><b>HIGH (P1)</b></font>", td_style),
            Paragraph("<b>Ghost Appointments (Revenue Leakage)</b><br/>Appointments have no payment check or invoice link.", td_style),
            Paragraph("appointment.py:L1-24", td_style),
            Paragraph("Patients receive treatments marked 'Completed' without front-desk POS billing.", td_style)
        ],
        [
            Paragraph("<font color='#d97706'><b>HIGH (P1)</b></font>", td_style),
            Paragraph("<b>Transaction Mutation De-sync</b><br/>Editing invoice amounts does not update Client total spent.", td_style),
            Paragraph("transactions.py:L52-71", td_style),
            Paragraph("Client CRM spend permanently diverges from actual ledger totals.", td_style)
        ],
        [
            Paragraph("<font color='#2563eb'><b>MEDIUM (P2)</b></font>", td_style),
            Paragraph("<b>Client-Side Memory Lag</b><br/>Entire transaction/expense history computed in React reduce().", td_style),
            Paragraph("finance-reports/page.tsx:L369-447", td_style),
            Paragraph("Severe browser freezes and network payload bloat as transaction records scale.", td_style)
        ]
    ]

    t_risk = Table(risk_data, colWidths=[70, 162, 110, 190])
    t_risk.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_risk)
    story.append(Spacer(1, 10))

    # ==========================================
    # SHOWSTOPPER BUGS IN DETAIL
    # ==========================================
    story.append(Paragraph("2. Deep Dive: Critical Showstopper Bugs", h1_style))

    story.append(Paragraph("2.1 Catastrophic Historical Salary Expense Purge", h2_style))
    story.append(Paragraph(
        "<b>Code Trace:</b> In <code>api/app/services/salary.py</code> (L54-64), the cleanup function <code>remove_expenses_by_staff_id()</code> "
        "is executed whenever a staff member's status is toggled to <code>Inactive</code> or when they are deleted in <code>api/app/routers/staff.py</code>. "
        "The query explicitly performs: <code>select(ExpenseItem).where(ExpenseItem.staff_id == staff_id, ExpenseItem.category == 'Salary')</code> "
        "and deletes <b>all matching records indiscriminately</b>, without checking if <code>status == 'Pending'</code> or <code>status == 'Paid'</code>.<br/>"
        "<b>Impact:</b> If a senior doctor worked at the clinic for 24 months and drew Rs. 200,000/month, setting their status to Inactive permanently "
        "purges Rs. 4,800,000 of historical paid expenses from the database. Prior fiscal year audits and tax filings become instantly falsified.", body_style
    ))

    story.append(Paragraph("2.2 Duplicate Primary Key Collision on Month 2+ Payroll", h2_style))
    story.append(Paragraph(
        "<b>Code Trace:</b> In <code>salary.py</code> (L40), newly generated salary records receive a deterministic primary key string: "
        "<code>new_expense = ExpenseItem(id=f'EXP-SAL-{member.id}', ...)</code>. In Month 1, this record is created and eventually marked 'Paid'. "
        "When Month 2 arrives, <code>sync_staff_salary_expense()</code> searches for a <i>pending</i> salary, finds none, and attempts to insert Month 2's salary "
        "using the identical key <code>EXP-SAL-{member.id}</code>. PostgreSQL immediately aborts the transaction with: "
        "<code>psycopg2.errors.UniqueViolation: duplicate key value violates unique constraint 'expenses_pkey'</code>.", body_style
    ))

    story.append(Paragraph("2.3 Authorization Deadlock in Multi-Approval Vendor Expense Deletions", h2_style))
    story.append(Paragraph(
        "<b>Code Trace:</b> In <code>api/app/routers/expenses.py</code> (L90-120), deleting a vendor expense mandates 100% sign-off from all accounts "
        "with roles <code>admin</code> and <code>partner</code>: <code>all(email in current_approvals for email in required_emails)</code>. "
        "However, the FastAPI endpoint dependency is defined as: <code>current_user = Depends(get_admin_user)</code>. "
        "When an equity partner logs in to submit their required approval, the endpoint throws a <code>403 Forbidden</code> error. "
        "Consequently, the approval threshold can never reach 100%, and vendor expenses cannot be deleted.", body_style
    ))

    story.append(PageBreak())

    # ==========================================
    # DOMAIN 1: SYSTEM OF PURCHASES & AP
    # ==========================================
    story.append(Paragraph("3. The System of Purchases, Procurement & Accounts Payable", h1_style))
    story.append(Paragraph(
        "In the current system, purchases of botox vials, hyaluronic fillers, laser consumables, and creams are handled through ad-hoc manual entries "
        "in the general expenses table. Stock inventory is manually incremented with no link to purchase costs.", body_style
    ))

    story.append(Paragraph("The Required 3-Way Match Procurement Cycle", h2_style))
    story.append(Paragraph(
        "To prevent medical supply shrinkage, over-billing, and unverified deliveries, all purchases must follow the 3-Way Match workflow:", body_style
    ))

    proc_data = [
        [Paragraph("Step", th_style), Paragraph("Workflow Stage", th_style), Paragraph("Operational Action", th_style), Paragraph("Ledger & Inventory Impact", th_style)],
        [
            Paragraph("<b>1</b>", td_bold),
            Paragraph("Purchase Order (PO)", td_bold),
            Paragraph("Doctor or Inventory Head drafts PO with approved vendor and negotiated unit costs.", td_style),
            Paragraph("No ledger entry. Status: 'Sent to Vendor'. Commitments tracked.", td_style)
        ],
        [
            Paragraph("<b>2</b>", td_bold),
            Paragraph("Goods Received Note (GRN)", td_bold),
            Paragraph("Stock arrives at clinic. Staff inspects boxes, logs physical count, <b>Batch Number</b> and <b>Expiry Date</b>.", td_style),
            Paragraph("Inventory Asset incremented immediately. Consumables available for treatment.", td_style)
        ],
        [
            Paragraph("<b>3</b>", td_bold),
            Paragraph("Supplier Bill & 3-Way Match", td_bold),
            Paragraph("Vendor sends invoice. System verifies PO Price == Bill Price and Ordered Qty == GRN Received Qty.", td_style),
            Paragraph("Debit: Inventory Asset (#1300)<br/>Credit: Accounts Payable to Supplier (#2010)", td_style)
        ],
        [
            Paragraph("<b>4</b>", td_bold),
            Paragraph("Bill Payment / Settlement", td_bold),
            Paragraph("Clinic issues bank transfer or cheque according to supplier credit terms (e.g. Net 30).", td_style),
            Paragraph("Debit: Accounts Payable (#2010)<br/>Credit: Operating Bank Account (#1030)", td_style)
        ]
    ]
    t_proc = Table(proc_data, colWidths=[30, 115, 197, 190])
    t_proc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_proc)
    story.append(Spacer(1, 10))

    # ==========================================
    # DOMAIN 2: RETAIL PRODUCTS & RETURN TO VENDOR
    # ==========================================
    story.append(Paragraph("4. Retail Product Sales & Vendor Purchase Returns (Debit Notes)", h1_style))
    story.append(Paragraph(
        "Luxury aesthetic clinics operate two distinct inventory streams: <b>Internal Professional Consumables</b> (vials and needles used in procedures) "
        "and <b>Retail Skincare Merchandise</b> (serums and sunscreens sold to take home). Furthermore, surplus, near-expiry, or damaged goods "
        "must be returned to suppliers with enforceable financial recovery.", body_style
    ))

    story.append(Paragraph("4.1 Retail Product Sales Engine", h2_style))
    story.append(Paragraph(
        "• <b>Dual-Catalog Separation:</b> Retail products must feature Barcode/SKU scanning at POS, independent retail prices, and wholesale purchase costs.<br/>"
        "• <b>Automated COGS & Gross Margin:</b> Selling a retail cream for Rs. 8,000 that was purchased at wholesale for Rs. 4,500 automatically generates: "
        "<code>Debit: Cost of Goods Sold (#5020) Rs. 4,500</code> and <code>Credit: Inventory Asset (#1300) Rs. 4,500</code>, locking in Rs. 3,500 Gross Margin.<br/>"
        "• <b>Dual-Tax Invoicing:</b> Medical procedures fall under Provincial Sales Tax (PRA/SRB), whereas retail cosmetic sales fall under Federal Sales Tax (FBR 18%). "
        "The POS invoice must itemize and separate these tax codes automatically.", bullet_style
    ))

    story.append(Paragraph("4.2 Vendor Purchase Returns (Return to Vendor - RTV) & Debit Notes", h2_style))
    story.append(Paragraph(
        "When stock is damaged on delivery, ordered in excess, or nearing expiry, the clinic returns items to the distributor. "
        "The system must execute a 4-step Return to Vendor flow:", body_style
    ))

    rtv_data = [
        [Paragraph("Action", th_style), Paragraph("System Operation", th_style), Paragraph("Financial & Accounting Entry", th_style)],
        [
            Paragraph("<b>1. Create RTV Order</b>", td_bold),
            Paragraph("Manager selects vendor, items, quantity returned, and return reason (e.g. 'Near Expiry').", td_style),
            Paragraph("Immediately decrements physical units from inventory ledger.", td_style)
        ],
        [
            Paragraph("<b>2. Generate Debit Note</b>", td_bold),
            Paragraph("System prints official Debit Note (DN-2026-001) with serial number for supplier courier sign-off.", td_style),
            Paragraph("Serves as legal proof of returned pharmaceutical goods.", td_style)
        ],
        [
            Paragraph("<b>3. A/P Settlement (Choice A)</b>", td_bold),
            Paragraph("If the vendor invoice was unpaid (Credit purchase), deduct returned value from outstanding bill.", td_style),
            Paragraph("Debit: Accounts Payable (#2010)<br/>Credit: Inventory Asset (#1300)", td_style)
        ],
        [
            Paragraph("<b>4. Refund / Credit (Choice B)</b>", td_bold),
            Paragraph("If bill was already paid, record incoming cash/bank refund or hold as Vendor Credit Balance.", td_style),
            Paragraph("Debit: Clinic Bank Account (#1030)<br/>Credit: Inventory Asset (#1300)", td_style)
        ]
    ]
    t_rtv = Table(rtv_data, colWidths=[120, 212, 200])
    t_rtv.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_rtv)
    story.append(Spacer(1, 10))

    # ==========================================
    # DOMAIN 3: ADVANCE PACKAGES & CLIENT DUES
    # ==========================================
    story.append(Paragraph("5. Advance Payments for Packages & Client Accounts Receivable (Dues)", h1_style))
    story.append(Paragraph(
        "Aesthetic clinics thrive on multi-session treatment packages and frequently extend credit terms to VIP clients. "
        "The platform currently has zero support for either flow.", body_style
    ))

    story.append(Paragraph("5.1 Multi-Session Packages & Deferred Revenue (GAAP / IFRS 15)", h2_style))
    story.append(Paragraph(
        "When a client pays Rs. 45,000 advance for a 3-session series (Rs. 15,000/session):<br/>"
        "• <b>Day 1 (Advance Paid):</b> Money received is <b>NOT</b> immediate earned revenue. It must be credited to a liability account: "
        "<code>Debit: Bank (#1030) Rs. 45,000</code> / <code>Credit: Deferred Revenue Liability (#2050) Rs. 45,000</code>. "
        "A <code>ClientPackage</code> record is initialized with 3 Total Sessions and 0 Used.<br/>"
        "• <b>Day 30 (Session 1 Redeemed):</b> Client arrives. Front desk selects 'Redeem Session'. The system records: "
        "<code>Debit: Deferred Revenue (#2050) Rs. 15,000</code> / <code>Credit: Treatment Revenue (#4010) Rs. 15,000</code>. "
        "A zero-charge receipt prints showing: <i>'Session 1 of 3 Redeemed — 2 Sessions Remaining'</i>.", body_style
    ))

    story.append(Paragraph("5.2 Client Accounts Receivable (A/R) & Installment Dues Ledger", h2_style))
    story.append(Paragraph(
        "When a client receives treatments worth Rs. 50,000, pays Rs. 20,000 cash today, and owes Rs. 30,000 on next visit:<br/>"
        "• <b>Split Invoice at Checkout:</b> The transaction logs: <code>Amount Paid Today: Rs. 20,000</code>, <code>Remaining Due: Rs. 30,000</code>, "
        "and <code>Status: Partially_Paid</code>. Ledger: <code>Debit: Cash Rs. 20,000</code>, <code>Debit: Client Accounts Receivable (#1200) Rs. 30,000</code>, "
        "<code>Credit: Service Revenue (#4010) Rs. 50,000</code>.<br/>"
        "• <b>Client Profile Statement & Settlement:</b> In the Client profile, an 'Outstanding Dues' badge displays Rs. 30,000. When the client returns to settle, "
        "clicking 'Collect Due Payment' issues an official Payment Receipt Voucher, clearing the debt: "
        "<code>Debit: Bank/Cash (+Rs. 30,000)</code> / <code>Credit: Accounts Receivable (-Rs. 30,000)</code>.", body_style
    ))

    story.append(PageBreak())

    # ==========================================
    # DOMAIN 4: TREASURY & REVENUE STORAGE
    # ==========================================
    story.append(Paragraph("6. Where Monthly Revenue Gets Stored: Treasury, Vaults & Month-End Close", h1_style))
    story.append(Paragraph(
        "In the existing codebase, revenue is <b>phantom money</b>: it exists only as an on-the-fly SQL summation over flat rows. "
        "It does not sit in any real-world asset account, and at month's end, it is never closed into retained earnings.", body_style
    ))

    story.append(Paragraph("6.1 Multi-Tier Treasury Architecture", h2_style))
    story.append(Paragraph(
        "Every rupee collected by the POS must map to a verified physical or digital treasury asset account:", body_style
    ))

    treasury_data = [
        [Paragraph("Treasury Tier", th_style), Paragraph("Account Type & GL Code", th_style), Paragraph("Physical / Digital Location", th_style), Paragraph("Reconciliation Cycle", th_style)],
        [
            Paragraph("<b>Tier 1: Drawer</b>", td_bold),
            Paragraph("Front Desk Cash Drawer<br/>(#1010 - Asset)", td_style),
            Paragraph("Physical cash register at branch reception desk.", td_style),
            Paragraph("<b>Daily Z-Report:</b> Cashier counts physical cash at shift end. Over/short variances logged.", td_style)
        ],
        [
            Paragraph("<b>Tier 2: Vault</b>", td_bold),
            Paragraph("Clinic Main Safe / Vault<br/>(#1015 - Asset)", td_style),
            Paragraph("Dual-custody physical safe in manager's office.", td_style),
            Paragraph("<b>Weekly Sweep:</b> Excess branch drawer cash transferred to vault for security.", td_style)
        ],
        [
            Paragraph("<b>Tier 3: In-Transit</b>", td_bold),
            Paragraph("POS Merchant Settlement<br/>(#1020 - Asset)", td_style),
            Paragraph("Credit card & online transaction funds held by bank terminal.", td_style),
            Paragraph("<b>T+1 Settlement:</b> Reconciled automatically against bank terminal batch reports.", td_style)
        ],
        [
            Paragraph("<b>Tier 4: Bank</b>", td_bold),
            Paragraph("Commercial Operating Acc<br/>(#1030 - Asset)", td_style),
            Paragraph("Meezan Bank / HBL Corporate Current Account.", td_style),
            Paragraph("<b>Monthly Bank Reconciliation:</b> Bank statement synced against general ledger.", td_style)
        ]
    ]
    t_treasury = Table(treasury_data, colWidths=[80, 132, 160, 160])
    t_treasury.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_treasury)
    story.append(Spacer(1, 8))

    story.append(Paragraph("6.2 The Month-End Closing Engine (Closing to Retained Earnings)", h2_style))
    story.append(Paragraph(
        "At 11:59 PM on the final day of each calendar month, the platform must execute a formal fiscal period close:<br/>"
        "1. All temporary revenue accounts (#4010, #4020) are debited (zeroed out).<br/>"
        "2. All temporary operational expense accounts (#5010-#5090) are credited (zeroed out).<br/>"
        "3. Net Income is calculated and credited to <b>Retained Earnings (#3010)</b> on the Balance Sheet.<br/>"
        "4. A specified percentage (e.g. 30%) is retained in the clinic for laser maintenance and working capital reserves; "
        "the remaining 70% flows into the <b>Partner Distributable Profit Pool</b>.", body_style
    ))

    # ==========================================
    # DOMAIN 5: PARTNER EQUITY & BRAND VALUATION
    # ==========================================
    story.append(Paragraph("7. Partners' Equity Dashboard, Withdrawals & Brand Valuation", h1_style))
    story.append(Paragraph(
        "Partners are currently represented merely as plain usernames in the <code>users</code> table. "
        "A luxury clinic must provide equity partners complete transparency into two vital metrics: "
        "<b>(1) Exactly how much money each partner has withdrawn to date</b>, and "
        "<b>(2) Exactly what their equity stake in the clinic brand is worth right now</b>.", body_style
    ))

    story.append(Paragraph("7.1 Tracking Partner Withdrawals (Drawings Account)", h2_style))
    story.append(Paragraph(
        "• <b>Separation from Expenses:</b> Partner withdrawals are <b>NOT</b> clinic operational expenses. "
        "Logging a partner withdrawal as an expense is illegal under tax law and corrupts clinic P&L margins.<br/>"
        "• <b>Equity Reduction:</b> Every drawing event (cheque, personal card payment, cash draw) is debited to the partner's "
        "<code>Partner Drawings Account (#3020)</code>, directly reducing their personal capital balance.<br/>"
        "• <b>Audit Trail:</b> Each withdrawal records: Date, Amount, Disbursing Account (e.g. Meezan Bank), Purpose, and Sign-off.", bullet_style
    ))

    story.append(Paragraph("7.2 What Partners Have in the Brand Right Now: Book vs. Brand Value", h2_style))
    story.append(Paragraph(
        "A partner's financial stake in Aura Luxury Clinic consists of two distinct valuation layers:", body_style
    ))

    eq_layers = [
        [Paragraph("Valuation Metric", th_style), Paragraph("Calculation Formula", th_style), Paragraph("Practical Meaning for the Partner", th_style)],
        [
            Paragraph("<b>1. Book Capital Balance (Net Liquidation Value)</b>", td_bold),
            Paragraph("<code>Initial Capital Injected<br/>+ Share of Accumulated Net Profit<br/>- Total Cumulative Drawings</code>", td_style),
            Paragraph("The exact cash and accounting equity the partner owns on the clinic balance sheet right now. Can be drawn as dividends or held as capital.", td_style)
        ],
        [
            Paragraph("<b>2. Fair Market Brand Value (Enterprise Stake)</b>", td_bold),
            Paragraph("<code>(Trailing 12-Mo EBITDA × Multiple [e.g. 5x]<br/>+ Net Tangible Assets)<br/>× Partner Equity %</code>", td_style),
            Paragraph("What the partner's ownership stake in the clinic is worth if sold, franchised, or pitched to external healthcare investors today.", td_style)
        ]
    ]
    t_eq = Table(eq_layers, colWidths=[150, 182, 200])
    t_eq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_eq)
    story.append(Spacer(1, 10))

    story.append(Paragraph("7.3 Visual Partner Equity Dashboard Layout Specification", h2_style))
    story.append(Paragraph(
        "In <code>app/finance-reports/page.tsx</code>, a dedicated <b>'Partner Equity & Brand Valuation'</b> tab will render the following card grid:", body_style
    ))

    # Mock Dashboard Table
    dash_data = [
        [Paragraph("Metric", th_style), Paragraph("Partner A (Managing Partner — 60%)", th_style), Paragraph("Partner B (Investing Partner — 40%)", th_style), Paragraph("Consolidated Clinic Brand", th_style)],
        [
            Paragraph("<b>Initial Capital Injected</b>", td_bold),
            Paragraph("Rs. 6,000,000", td_style),
            Paragraph("Rs. 4,000,000", td_style),
            Paragraph("Rs. 10,000,000", td_bold)
        ],
        [
            Paragraph("<b>Cumulative Profit Share Earned</b>", td_bold),
            Paragraph("Rs. 7,200,000 (60% of Net)", td_style),
            Paragraph("Rs. 4,800,000 (40% of Net)", td_style),
            Paragraph("Rs. 12,000,000", td_bold)
        ],
        [
            Paragraph("<b>Total Withdrawn to Date (Drawings)</b>", td_bold),
            Paragraph("<font color='#b91c1c'><b>-Rs. 4,500,000</b></font>", td_style),
            Paragraph("<font color='#b91c1c'><b>-Rs. 2,000,000</b></font>", td_style),
            Paragraph("<font color='#b91c1c'><b>-Rs. 6,500,000</b></font>", td_bold)
        ],
        [
            Paragraph("<b>Current Net Capital Balance (Book)</b>", td_bold),
            Paragraph("<b>Rs. 8,700,000</b>", td_style),
            Paragraph("<b>Rs. 6,800,000</b>", td_style),
            Paragraph("<b>Rs. 15,500,000</b>", td_bold)
        ],
        [
            Paragraph("<b>Current Market Brand Stake (5x EBITDA)</b>", td_bold),
            Paragraph("<font color='#047857'><b>Rs. 24,000,000</b></font>", td_style),
            Paragraph("<font color='#047857'><b>Rs. 16,000,000</b></font>", td_style),
            Paragraph("<font color='#047857'><b>Rs. 40,000,000</b></font>", td_bold)
        ]
    ]
    t_dash = Table(dash_data, colWidths=[150, 130, 130, 122])
    t_dash.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_dash)

    story.append(PageBreak())

    # ==========================================
    # DOMAIN 6: COMPLETE TECHNICAL REMEDIATION ROADMAP
    # ==========================================
    story.append(Paragraph("8. Technical Remediation & Implementation Roadmap", h1_style))
    story.append(Paragraph(
        "To transform DBS-System into an enterprise luxury clinic platform, development should follow this phased implementation timeline:", body_style
    ))

    roadmap_data = [
        [Paragraph("Phase", th_style), Paragraph("Focus Area", th_style), Paragraph("Key Technical Deliverables", th_style), Paragraph("Estimated Effort", th_style)],
        [
            Paragraph("<b>Phase 1 (Hotfixes)</b>", td_bold),
            Paragraph("Critical Bug Patches & Data Integrity", td_style),
            Paragraph(
                "• In <code>salary.py</code>: modify <code>remove_expenses_by_staff_id()</code> to only purge <code>status == 'Pending'</code>.<br/>"
                "• Generate date-tokenized salary IDs (<code>EXP-SAL-{id}-{YYYYMM}</code>) to eliminate duplicate PK collisions.<br/>"
                "• Change <code>DELETE /expenses/{id}</code> dependency to <code>get_admin_or_partner_user</code>.<br/>"
                "• Sync <code>Client.total_spent</code> on <code>PUT /transactions/{id}</code>.", td_style
            ),
            Paragraph("48 Hours<br/>(Immediate P0)", td_style)
        ],
        [
            Paragraph("<b>Phase 2 (POS & Billing)</b>", td_bold),
            Paragraph("Packages, Dues & Retail Products", td_style),
            Paragraph(
                "• Implement <code>ClientPackage</code> and deferred session redemption tracking.<br/>"
                "• Add <code>amount_paid</code> and <code>remaining_due</code> to transactions for partial client billing.<br/>"
                "• Add Client Profile Outstanding Dues statement and Installment Receipt generation.<br/>"
                "• Decouple retail take-home products with barcode lookup and automated wholesale COGS.", td_style
            ),
            Paragraph("Weeks 1 – 2", td_style)
        ],
        [
            Paragraph("<b>Phase 3 (Purchases & RTV)</b>", td_bold),
            Paragraph("Procurement & Vendor Returns", td_style),
            Paragraph(
                "• Build Purchase Order (PO) and Goods Received Note (GRN) workflow with batch & expiry dates.<br/>"
                "• Implement Return to Vendor (RTV) interface with printable Debit Notes.<br/>"
                "• Real-time Accounts Payable (A/P) aging statements for pharmaceutical suppliers.", td_style
            ),
            Paragraph("Weeks 3 – 4", td_style)
        ],
        [
            Paragraph("<b>Phase 4 (Treasury & Equity)</b>", td_bold),
            Paragraph("Treasury, Close & Partner Dashboard", td_style),
            Paragraph(
                "• Setup multi-account Treasury (Cash Drawers, Main Vault, Commercial Bank Accounts).<br/>"
                "• Build End-of-Day Cash Drawer Z-Report shift closeout screen.<br/>"
                "• Implement Automated Month-End Close allocating net profit into Retained Earnings.<br/>"
                "• Deploy Partner Equity Dashboard displaying capital, withdrawals to date, and live brand valuation.", td_style
            ),
            Paragraph("Weeks 5 – 6", td_style)
        ]
    ]

    t_road = Table(roadmap_data, colWidths=[90, 120, 242, 80])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_road)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Sign-Off & Document Verification", h2_style))
    story.append(Paragraph(
        "This document represents the complete, unified financial and technical audit for Aura Luxury Clinic. "
        "Executing the Phase 1 hotfixes immediately guarantees that no historical salary records will be purged, "
        "and paves the way for a fully compliant, multi-branch, partner-governed luxury medical ERP.", body_style
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated audit report PDF at: {filename}")

if __name__ == "__main__":
    output_path = r"c:\Users\amtul\Desktop\DBS-System\Aura_Clinic_Financial_Systems_Comprehensive_Report.pdf"
    build_pdf(output_path)
