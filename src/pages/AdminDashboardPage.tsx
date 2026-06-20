import { type FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router";
import AdminRoleBadge, { getUserRoles } from "../components/AdminRoleBadge";
import StatusBadge from "../components/StatusBadge";
import { auth } from "../config/firebase";
import {
  addAdminInviteAsBoss,
  deleteRentalRequestAsAdmin,
  deletePropertyAsAdmin,
  deleteAdminInviteAsBoss,
  getAllPaymentHistory,
  getAllAdminInvitesAsAdmin,
  getAllProperties,
  getAllRentalRequests,
  getAllUsers,
  normalizeAdminInviteEmail,
  updateRentalRequestStatusAsAdmin,
  type AdminInvite,
  type AdminEmployeeRole,
} from "../services/adminService";
import type { PaymentHistory } from "../types/PaymentHistory";
import type { Property } from "../types/Property";
import type { RentalRequest, RentalRequestStatus } from "../types/RentalRequest";
import type { AppUser } from "../types/User";

function formatDate(
  value: AppUser["createdAt"] | RentalRequest["createdAt"] | PaymentHistory["paidAt"],
) {
  return value ? value.toDate().toLocaleDateString() : "-";
}

function formatPrice(
  value: Property["price"] | RentalRequest["propertyPrice"] | PaymentHistory["totalPaid"],
) {
  return typeof value === "number" ? `RM ${value.toLocaleString()}` : "-";
}

function formatContractYears(years = 1) {
  return `${years} year${years === 1 ? "" : "s"}`;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function getDisplayedPropertyStatus(property: Property, requests: RentalRequest[]) {
  const hasApprovedRental = requests.some(
    (request) =>
      request.propertyId === property.id &&
      request.ownerId === property.ownerId &&
      request.status === "approved",
  );

  return hasApprovedRental ? "rented" : property.status;
}

function getTimestampDate(
  value:
    | AppUser["createdAt"]
    | RentalRequest["createdAt"]
    | PaymentHistory["paidAt"]
    | PaymentHistory["createdAt"],
) {
  return value?.toDate();
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getShortDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeExcelCell(value: unknown) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type ExcelSheet = {
  name: string;
  title: string;
  headers: string[];
  rows: Array<Array<unknown>>;
};

function getExcelCellType(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? "Number" : "String";
}

function buildExcelRow(cells: Array<unknown>, styleId?: string) {
  return `<Row>${cells
    .map(
      (cell) =>
        `<Cell${styleId ? ` ss:StyleID="${styleId}"` : ""}><Data ss:Type="${getExcelCellType(cell)}">${escapeExcelCell(cell)}</Data></Cell>`,
    )
    .join("")}</Row>`;
}

function buildExcelWorksheet(sheet: ExcelSheet) {
  return `
    <Worksheet ss:Name="${escapeExcelCell(sheet.name)}">
      <Table>
        <Column ss:AutoFitWidth="1" ss:Width="170" />
        <Column ss:AutoFitWidth="1" ss:Width="180" />
        <Column ss:AutoFitWidth="1" ss:Width="190" />
        <Column ss:AutoFitWidth="1" ss:Width="170" />
        <Column ss:AutoFitWidth="1" ss:Width="120" />
        <Column ss:AutoFitWidth="1" ss:Width="120" />
        <Column ss:AutoFitWidth="1" ss:Width="180" />
        <Column ss:AutoFitWidth="1" ss:Width="130" />
        <Column ss:AutoFitWidth="1" ss:Width="130" />
        ${buildExcelRow([sheet.title], "Title")}
        ${buildExcelRow(sheet.headers, "Header")}
        ${sheet.rows
          .map((row, index) => buildExcelRow(row, index % 2 === 0 ? "EvenRow" : "OddRow"))
          .join("")}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <FreezePanes />
        <FrozenNoSplit />
        <SplitHorizontal>2</SplitHorizontal>
        <TopRowBottomPane>2</TopRowBottomPane>
        <ActivePane>2</ActivePane>
      </WorksheetOptions>
    </Worksheet>
  `;
}

function buildExcelWorkbook(sheets: ExcelSheet[]) {
  return `
    <?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook
      xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Styles>
        <Style ss:ID="Title">
          <Font ss:Bold="1" ss:Size="14" ss:Color="#FFFFFF" />
          <Interior ss:Color="#111827" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A" />
          </Borders>
        </Style>
        <Style ss:ID="Header">
          <Font ss:Bold="1" ss:Color="#FFFFFF" />
          <Interior ss:Color="#2563EB" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E3A8A" />
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD" />
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD" />
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD" />
          </Borders>
        </Style>
        <Style ss:ID="EvenRow">
          <Interior ss:Color="#EFF6FF" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE" />
          </Borders>
        </Style>
        <Style ss:ID="OddRow">
          <Interior ss:Color="#FFFFFF" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBEAFE" />
          </Borders>
        </Style>
      </Styles>
      ${sheets.map(buildExcelWorksheet).join("")}
    </Workbook>
  `;
}

const navItems = [
  { id: "dashboard", label: "Overview", icon: "O", detail: "Platform summary" },
  { id: "employees", label: "Employees", icon: "E", detail: "Staff list" },
  { id: "users", label: "Users", icon: "U", detail: "Account roles" },
  { id: "properties", label: "Properties", icon: "P", detail: "Listings control" },
  { id: "rental-requests", label: "Requests", icon: "R", detail: "Tenant demand" },
  { id: "payments", label: "Payments", icon: "$", detail: "Paid history" },
];

const bossEmail = "joesernsua@gmail.com";

const employeeRoleOptions: Array<{
  id: AdminEmployeeRole;
  label: string;
  access: string;
  description: string;
}> = [
  {
    id: "manager",
    label: "Manager",
    access: "Users, Properties, Requests, Payments",
    description: "For senior staff who can monitor most admin records.",
  },
  {
    id: "property-staff",
    label: "Property staff",
    access: "Properties, Requests",
    description: "For staff who handle listings and rental request follow-up.",
  },
  {
    id: "finance-staff",
    label: "Finance staff",
    access: "Requests, Payments",
    description: "For staff who review billing and payment records.",
  },
];

const employeeRoleAccess: Record<AdminEmployeeRole, string[]> = {
  manager: ["dashboard", "users", "properties", "rental-requests", "payments"],
  "property-staff": ["dashboard", "properties", "rental-requests"],
  "finance-staff": ["dashboard", "rental-requests", "payments"],
};

function getEmployeeRoleLabel(role?: string) {
  return employeeRoleOptions.find((option) => option.id === role)?.label ?? "Manager";
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const currentAdminEmail = auth.currentUser?.email?.toLowerCase() ?? "";
  const isBossAccount = currentAdminEmail === bossEmail;
  const [activeSection, setActiveSection] = useState("dashboard");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(isBossAccount);
  const [usersError, setUsersError] = useState("");
  const [propertiesError, setPropertiesError] = useState("");
  const [requestsError, setRequestsError] = useState("");
  const [paymentsError, setPaymentsError] = useState("");
  const [invitesError, setInvitesError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [pendingEmployeeEmail, setPendingEmployeeEmail] = useState("");
  const [selectedEmployeeRole, setSelectedEmployeeRole] = useState<AdminEmployeeRole>("manager");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);

  useEffect(() => {
    getAllUsers()
      .then((items) => {
        setUsers(items);
      })
      .catch(() => setUsersError("Unable to load users."))
      .finally(() => setUsersLoading(false));
    getAllProperties()
      .then(setProperties)
      .catch(() => setPropertiesError("Unable to load properties."))
      .finally(() => setPropertiesLoading(false));
    getAllRentalRequests()
      .then(setRequests)
      .catch(() => setRequestsError("Unable to load rental requests."))
      .finally(() => setRequestsLoading(false));
    getAllPaymentHistory()
      .then((items) =>
        setPayments(
          items.sort(
            (first, second) =>
              (second.paidAt?.toMillis() ?? second.createdAt?.toMillis() ?? 0) -
              (first.paidAt?.toMillis() ?? first.createdAt?.toMillis() ?? 0),
          ),
        ),
      )
      .catch(() => setPaymentsError("Unable to load payment history."))
      .finally(() => setPaymentsLoading(false));
  }, []);

  useEffect(() => {
    if (!isBossAccount) {
      setAdminInvites([]);
      setInvitesLoading(false);
      return;
    }

    setInvitesLoading(true);
    getAllAdminInvitesAsAdmin()
      .then((items) =>
        setAdminInvites(
          items.sort((first, second) => first.email.localeCompare(second.email)),
        ),
      )
      .catch(() => setInvitesError("Unable to load employee invites."))
      .finally(() => setInvitesLoading(false));
  }, [isBossAccount]);

  const handleDelete = async (property: Property) => {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
    setDeletingId(property.id);
    setPropertiesError("");
    try {
      await deletePropertyAsAdmin(property.id);
      setProperties((items) => items.filter((item) => item.id !== property.id));
    } catch {
      setPropertiesError("Unable to delete the property.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteRequest = async (request: RentalRequest) => {
    if (!window.confirm(`Delete request for "${request.propertyTitle}"? This cannot be undone.`)) return;
    setDeletingId(request.id);
    setRequestsError("");
    try {
      await deleteRentalRequestAsAdmin(request.id);
      setRequests((items) => items.filter((item) => item.id !== request.id));
    } catch {
      setRequestsError("Unable to delete the rental request.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRejectRequest = async (request: RentalRequest) => {
    setUpdatingId(request.id);
    setRequestsError("");
    try {
      await updateRentalRequestStatusAsAdmin(request.id, "rejected");
      setRequests((items) =>
        items.map((item) =>
          item.id === request.id ? { ...item, status: "rejected" as RentalRequestStatus } : item,
        ),
      );
    } catch {
      setRequestsError("Unable to reject the rental request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const validateEmployeeEmail = (email: string) => {
    const normalizedEmail = normalizeAdminInviteEmail(email);

    if (!normalizedEmail) {
      setInvitesError("Please enter an employee email.");
      return null;
    }
    if (normalizedEmail === bossEmail) {
      setInvitesError("Boss account is already the main admin.");
      return null;
    }
    if (employees.some((employee) => employee.email.toLowerCase() === normalizedEmail)) {
      setInvitesError("This employee already has an admin account.");
      return null;
    }

    return normalizedEmail;
  };

  const handleAddEmployee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = validateEmployeeEmail(employeeEmail);
    if (!normalizedEmail) return;

    setInvitesError("");
    setPendingEmployeeEmail(normalizedEmail);
    setSelectedEmployeeRole("manager");
    setIsRoleDialogOpen(true);
  };

  const handleConfirmEmployeeInvite = async () => {
    const normalizedEmail = validateEmployeeEmail(pendingEmployeeEmail);
    const currentAdmin = auth.currentUser;

    if (!currentAdmin || !normalizedEmail) return;

    setAddingEmployee(true);
    setInvitesError("");
    try {
      await addAdminInviteAsBoss(normalizedEmail, currentAdmin.uid, selectedEmployeeRole);
      setAdminInvites((items) => {
        const nextInvite: AdminInvite = {
          id: normalizedEmail,
          email: normalizedEmail,
          employeeRole: selectedEmployeeRole,
          status: "invited",
          createdBy: currentAdmin.uid,
        };
        const withoutDuplicate = items.filter((item) => item.email !== normalizedEmail);
        return [...withoutDuplicate, nextInvite].sort((first, second) =>
          first.email.localeCompare(second.email),
        );
      });
      setEmployeeEmail("");
      setPendingEmployeeEmail("");
      setIsRoleDialogOpen(false);
    } catch {
      setInvitesError("Unable to add employee email.");
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleDeleteInvite = async (invite: AdminInvite) => {
    if (!window.confirm(`Remove invite for "${invite.email}"?`)) return;
    setDeletingId(invite.id);
    setInvitesError("");
    try {
      await deleteAdminInviteAsBoss(invite.email);
      setAdminInvites((items) => items.filter((item) => item.id !== invite.id));
    } catch {
      setInvitesError("Unable to remove employee invite.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
    navigate("/admin-login", { replace: true });
  };

  const handleSidebarNavigation = (sectionId: string) => {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportData = () => {
    const exportedAt = new Date().toISOString();
    const workbook = buildExcelWorkbook([
      {
        name: "Users",
        title: "Users",
        headers: ["UID", "Name", "Email", "Roles", "Phone", "Created"],
        rows: users.map((user) => [
            user.uid,
            user.name || user.displayName || "-",
            user.email,
            getUserRoles(user).join(", "),
            user.phone || "-",
            formatDate(user.createdAt),
          ]),
      },
      {
        name: "Employees",
        title: "Employees",
        headers: ["UID", "Name", "Email", "Roles", "Phone", "Created"],
        rows: employees.map((employee) => [
            employee.uid,
            employee.name || employee.displayName || "-",
            employee.email,
            getUserRoles(employee).join(", "),
            employee.phone || "-",
            formatDate(employee.createdAt),
          ]),
      },
      {
        name: "Employee Invites",
        title: "Employee Invites",
        headers: ["Email", "Employee Role", "Status", "Created By", "Created"],
        rows: adminInvites.map((invite) => [
            invite.email,
            getEmployeeRoleLabel(invite.employeeRole),
            invite.status,
            invite.createdBy,
            formatDate(invite.createdAt),
          ]),
      },
      {
        name: "Properties",
        title: "Properties",
        headers: ["Property ID", "Title", "Location", "Type", "Price", "Status", "Owner ID"],
        rows: displayedProperties.map((property) => [
            property.id,
            property.title,
            property.location,
            property.type,
            property.price,
            property.displayStatus,
            property.ownerId,
          ]),
      },
      {
        name: "Rental Requests",
        title: "Rental Requests",
        headers: ["Request ID", "Property", "Tenant", "Email", "Price", "Contract", "Status", "Created"],
        rows: requests.map((request) => [
            request.id,
            request.propertyTitle,
            request.tenantName,
            request.tenantEmail,
            request.propertyPrice,
            formatContractYears(request.contractYears),
            request.status,
            formatDate(request.createdAt),
          ]),
      },
      {
        name: "Payment History",
        title: "Payment History",
        headers: ["Payment ID", "Tenant", "Email", "Property", "Billing Period", "Payment Method", "Total Paid", "Status", "Paid Date"],
        rows: payments.map((payment) => [
            payment.id,
            payment.tenantName,
            payment.tenantEmail,
            payment.propertyTitle,
            payment.billingPeriod,
            payment.paymentMethodType,
            payment.totalPaid,
            payment.status,
            formatDate(payment.paidAt ?? payment.createdAt),
          ]),
      },
      {
        name: "Export Info",
        title: "Export Info",
        headers: ["Field", "Value"],
        rows: [["Exported At", exportedAt]],
      },
    ]);

    downloadFile(
      `rentspace-admin-export-${exportedAt.slice(0, 10)}.xls`,
      workbook,
      "application/vnd.ms-excel;charset=utf-8",
    );
  };

  const handleCreateReport = () => {
    const reportDate = new Date();
    const workbook = buildExcelWorkbook([
      {
        name: "Summary",
        title: "Summary",
        headers: ["Metric", "Value"],
        rows: [
            ["Generated", reportDate.toLocaleString()],
            ["Users", users.length],
            ["Properties", properties.length],
            ["Rental Requests", requests.length],
            ["Pending Requests", pendingRequests],
            ["Approved Requests", approvedRequests],
            ["Rejected Requests", requests.filter((request) => request.status === "rejected").length],
            ["Available Properties", availableProperties],
            ["Pending Properties", displayedProperties.filter((property) => property.displayStatus === "pending").length],
            ["Rented Properties", displayedProperties.filter((property) => property.displayStatus === "rented").length],
            ["Total Listed Rent", totalMonthlyRent],
            ["Paid Revenue", paidRevenue],
          ],
      },
      {
        name: "Recent Payments",
        title: "Recent Payments",
        headers: ["Payment ID", "Tenant", "Property", "Billing Period", "Total Paid", "Paid Date"],
        rows: payments.slice(0, 10).map((payment) => [
            payment.id,
            payment.tenantName,
            payment.propertyTitle,
            payment.billingPeriod,
            payment.totalPaid,
            formatDate(payment.paidAt ?? payment.createdAt),
          ]),
      },
      {
        name: "7 Days Activity",
        title: "Last 7 Days Activity",
        headers: ["Date", "Requests", "Payments", "Revenue"],
        rows: dailyActivity.map((day) => [day.label, day.requests, day.payments, day.revenue]),
      },
    ]);

    downloadFile(
      `rentspace-admin-report-${reportDate.toISOString().slice(0, 10)}.xls`,
      workbook,
      "application/vnd.ms-excel;charset=utf-8",
    );
  };

  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const approvedRequests = requests.filter((request) => request.status === "approved").length;
  const displayedProperties = properties.map((property) => ({
    ...property,
    displayStatus: getDisplayedPropertyStatus(property, requests),
  }));
  const availableProperties = displayedProperties.filter((property) => property.displayStatus === "available").length;
  const totalMonthlyRent = properties.reduce((total, property) => total + (typeof property.price === "number" ? property.price : 0), 0);
  const paidRevenue = payments.reduce((total, payment) => total + (typeof payment.totalPaid === "number" ? payment.totalPaid : 0), 0);
  const isLoading = usersLoading || propertiesLoading || requestsLoading || paymentsLoading || invitesLoading;
  const currentAdminProfile = users.find(
    (user) => user.email?.toLowerCase() === currentAdminEmail,
  ) as (AppUser & { adminEmployeeRole?: AdminEmployeeRole }) | undefined;
  const currentEmployeeRole = currentAdminProfile?.adminEmployeeRole;
  const allowedNavIds = isBossAccount
    ? navItems.map((item) => item.id)
    : employeeRoleAccess[currentEmployeeRole ?? "manager"];
  const visibleNavItems = navItems.filter(
    (item) =>
      allowedNavIds.includes(item.id) &&
      (item.id !== "employees" || isBossAccount),
  );
  const employees = users.filter(
    (user) =>
      user.email?.toLowerCase() !== bossEmail &&
      getUserRoles(user).includes("admin"),
  );
  const registeredEmployeeEmails = new Set(
    employees.map((employee) => employee.email.toLowerCase()),
  );
  const pendingAdminInvites = adminInvites.filter(
    (invite) => !registeredEmployeeEmails.has(invite.email.toLowerCase()),
  );
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = normalizedUserSearch
    ? users.filter((user) => {
        const searchableText = [
          user.name,
          user.displayName,
          user.email,
          user.phone,
          ...getUserRoles(user),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedUserSearch);
      })
    : users;
  const normalizedPropertySearch = propertySearch.trim().toLowerCase();
  const filteredProperties = normalizedPropertySearch
    ? displayedProperties.filter((property) => {
        const searchableText = [
          property.title,
          property.location,
          property.type,
          property.displayStatus,
          property.ownerId,
          formatPrice(property.price),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedPropertySearch);
      })
    : displayedProperties;
  const normalizedRequestSearch = requestSearch.trim().toLowerCase();
  const filteredRequests = normalizedRequestSearch
    ? requests.filter((request) => {
        const searchableText = [
          request.propertyTitle,
          request.tenantName,
          request.tenantEmail,
          request.status,
          formatPrice(request.propertyPrice),
          formatContractYears(request.contractYears),
          formatDate(request.createdAt),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedRequestSearch);
      })
    : requests;
  const normalizedPaymentSearch = paymentSearch.trim().toLowerCase();
  const filteredPayments = normalizedPaymentSearch
    ? payments.filter((payment) => {
        const searchableText = [
          payment.id,
          payment.tenantName,
          payment.tenantEmail,
          payment.propertyTitle,
          payment.billingPeriod,
          payment.paymentMethodType,
          payment.status,
          formatPrice(payment.totalPaid),
          formatDate(payment.paidAt ?? payment.createdAt),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedPaymentSearch);
      })
    : payments;
  const filteredPaidRevenue = filteredPayments.reduce((total, payment) => total + (typeof payment.totalPaid === "number" ? payment.totalPaid : 0), 0);

  const summaryCards = [
    { label: "Total users", value: usersLoading ? "-" : users.length.toLocaleString(), icon: "U", change: "+ active" },
    { label: "Properties", value: propertiesLoading ? "-" : properties.length.toLocaleString(), icon: "P", change: `${availableProperties} available` },
    { label: "Requests", value: requestsLoading ? "-" : requests.length.toLocaleString(), icon: "R", change: `${pendingRequests} pending` },
    { label: "Paid revenue", value: paymentsLoading ? "-" : formatPrice(paidRevenue), icon: "$", change: `${payments.length} payments` },
  ];

  const dailyActivity = useMemo(
    () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const key = getDateKey(date);

        const requestsCount = requests.filter((request) => {
          const createdAt = getTimestampDate(request.createdAt);
          return createdAt ? getDateKey(createdAt) === key : false;
        }).length;

        const dayPayments = payments.filter((payment) => {
          const paidAt = getTimestampDate(payment.paidAt ?? payment.createdAt);
          return paidAt ? getDateKey(paidAt) === key : false;
        });

        return {
          key,
          label: getShortDateLabel(date),
          requests: requestsCount,
          payments: dayPayments.length,
          revenue: dayPayments.reduce((total, payment) => total + payment.totalPaid, 0),
        };
      });
    },
    [payments, requests],
  );

  const maxDailyValue = Math.max(
    1,
    ...dailyActivity.flatMap((day) => [day.requests, day.payments]),
  );
  const maxDailyRevenue = Math.max(1, ...dailyActivity.map((day) => day.revenue));

  const overviewRows = [
    { label: "Tenant accounts", value: users.filter((user) => getUserRoles(user).includes("tenant")).length.toLocaleString(), section: "users" },
    { label: "Owner accounts", value: users.filter((user) => getUserRoles(user).includes("owner")).length.toLocaleString(), section: "users" },
    { label: "Approved requests", value: approvedRequests.toLocaleString(), section: "rental-requests" },
    { label: "Total listed rent", value: formatPrice(totalMonthlyRent), section: "properties" },
    { label: "Payments this week", value: dailyActivity.reduce((total, day) => total + day.payments, 0).toLocaleString(), section: "payments" },
    { label: "Revenue this week", value: formatPrice(dailyActivity.reduce((total, day) => total + day.revenue, 0)), section: "payments" },
  ];

  return (
    <main className="min-h-screen bg-[#070b1d] text-slate-100">
      <div className="min-h-screen">
        <aside className="flex border-b border-white/10 bg-[#080d20] p-6 lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:flex-col lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#101834] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3">
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-lg font-black text-[#07111f] shadow-lg shadow-emerald-400/20">
                R
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-cyan-300 ring-4 ring-[#101834]" />
              </span>
              <div>
                <p className="text-lg font-black tracking-tight text-white">RentSpace Admin</p>
                <p className="text-xs text-slate-500">Control center</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-[#080d20] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Live system</p>
              <p className="mt-2 text-sm text-slate-400">{users.length} users Â· {properties.length} listings</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Admin menu</p>
            {visibleNavItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSidebarNavigation(item.id)}
                className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  activeSection === item.id
                    ? "border-emerald-300/40 bg-emerald-400 text-[#07111f] shadow-lg shadow-emerald-400/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${
                    activeSection === item.id ? "bg-[#07111f] text-emerald-300" : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    {item.icon}
                  </span>
                  <span>
                    <span className="block">{item.label}</span>
                    <span className={`mt-0.5 block text-xs font-medium ${
                      activeSection === item.id ? "text-[#07111f]/70" : "text-slate-600 group-hover:text-slate-400"
                    }`}>
                      {item.detail}
                    </span>
                  </span>
                </span>
                <span className={activeSection === item.id ? "text-[#07111f]/60" : "text-slate-700"}>&gt;</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => void handleAdminLogout()}
            className="mt-auto hidden rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/20 lg:block"
          >
            Logout admin
          </button>
        </aside>

        <section id="dashboard" className="overflow-hidden p-6 sm:p-8 lg:ml-72 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Welcome back, Admin</h1>
              <p className="mt-2 text-sm text-slate-400">Monitor users, properties, and rental activity across the platform.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleExportData} disabled={isLoading} className="rounded-xl border border-white/10 bg-[#111936] px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">Export data</button>
              <button type="button" onClick={handleCreateReport} disabled={isLoading} className="rounded-xl bg-fuchsia-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60">Create report</button>
              <button type="button" onClick={() => void handleAdminLogout()} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/20">Logout</button>
            </div>
          </div>

          {activeSection === "dashboard" && (
            <>
              <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((summary) => (
                  <article key={summary.label} className="rounded-2xl border border-white/10 bg-[#101834] p-5 shadow-xl shadow-black/10">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span className="flex items-center gap-2"><span>{summary.icon}</span>{summary.label}</span>
                      <span>...</span>
                    </div>
                    <div className="mt-5 flex items-end gap-3">
                      <p className="text-3xl font-black text-white">{summary.value}</p>
                      <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300">{summary.change}</span>
                    </div>
                  </article>
                ))}
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
                <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-400">Real activity from Firestore</p>
                      <p className="mt-2 text-3xl font-black text-white">Last 7 days</p>
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Requests</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Payments</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue</span>
                    </div>
                  </div>
                  <div className="mt-8 bg-[#080d20] p-5">
                    <div className="grid min-h-64 grid-cols-7 items-end gap-3">
                      {dailyActivity.map((day) => (
                        <div key={day.key} className="flex h-full min-w-0 flex-col justify-end gap-3">
                          <div className="flex min-h-48 items-end justify-center gap-1 bg-white/[0.03] px-2 py-3">
                            <span
                              className="w-2 origin-bottom animate-[barGrow_700ms_ease-out_both] bg-cyan-400"
                              title={`${day.requests} requests`}
                              style={{ height: `${Math.max(8, (day.requests / maxDailyValue) * 100)}%` }}
                            />
                            <span
                              className="w-2 origin-bottom animate-[barGrow_850ms_ease-out_both] bg-fuchsia-500"
                              title={`${day.payments} payments`}
                              style={{ height: `${Math.max(8, (day.payments / maxDailyValue) * 100)}%` }}
                            />
                            <span
                              className="w-2 origin-bottom animate-[barGrow_1000ms_ease-out_both] bg-emerald-400"
                              title={`${formatPrice(day.revenue)} revenue`}
                              style={{ height: `${Math.max(8, (day.revenue / maxDailyRevenue) * 100)}%` }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="truncate text-xs font-black text-slate-300">{day.label}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">{day.requests} req · {day.payments} paid</p>
                            <p className="mt-1 truncate text-[11px] font-bold text-emerald-300">{formatPrice(day.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {overviewRows.map((row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() => handleSidebarNavigation(row.section)}
                        className="bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                        <p className="mt-2 text-lg font-black text-white">{row.value}</p>
                      </button>
                    ))}
                  </div>
                </article>

                <div className="grid gap-5">
                  <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                    <p className="text-sm font-bold text-slate-400">Request approval rate</p>
                    <p className="mt-2 text-3xl font-black text-white">{percent(approvedRequests, requests.length)}%</p>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${percent(approvedRequests, requests.length)}%` }} />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">{approvedRequests} approved from {requests.length} total requests.</p>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                    <p className="text-sm font-bold text-slate-400">Property availability</p>
                    <p className="mt-2 text-3xl font-black text-white">{percent(availableProperties, properties.length)}%</p>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-400">
                      <span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">{availableProperties}<br />Available</span>
                      <span className="rounded-xl bg-amber-400/10 p-3 text-amber-300">{displayedProperties.filter((item) => item.displayStatus === "pending").length}<br />Pending</span>
                      <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">{displayedProperties.filter((item) => item.displayStatus === "rented").length}<br />Rented</span>
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}

          {(usersError || propertiesError || requestsError || paymentsError || invitesError) && (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {[usersError, propertiesError, requestsError, paymentsError, invitesError].filter(Boolean).join(" ")}
            </div>
          )}

          {activeSection === "users" && (
          <section id="users" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[180px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Users</h2>
                <p className="mt-1 text-sm text-slate-400">Registered accounts and platform roles.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name, email, phone, or role"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredUsers.length} records</span>
            </div>
            {usersLoading ? <p className="mt-5 text-slate-400">Loading users...</p> : users.length === 0 ? <p className="mt-5 text-slate-400">No users found.</p> : filteredUsers.length === 0 ? <p className="mt-5 text-slate-400">No users match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Name</th><th className="py-3 pr-5">Email</th><th className="py-3 pr-5">Role</th><th className="py-3 pr-5">Created</th><th className="py-3 pr-5">Profile</th></tr></thead>
                  <tbody>{filteredUsers.map((user) => <tr key={user.uid} className="border-t border-white/10"><td className="py-4 pr-5 font-semibold text-white">{user.name || user.displayName || "-"}</td><td className="py-4 pr-5 text-slate-300">{user.email}</td><td className="py-4 pr-5"><div className="flex flex-wrap gap-2">{getUserRoles(user).map((role) => <AdminRoleBadge key={role} role={role} />)}</div></td><td className="py-4 pr-5 text-slate-500">{formatDate(user.createdAt)}</td><td className="py-4 pr-5"><Link to={`/admin-users/${user.uid}`} className="inline-flex rounded-lg bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-400/20">View profile</Link></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "employees" && isBossAccount && (
          <section id="employees" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Employees</h2>
                <p className="mt-1 text-sm text-slate-400">Add employee Gmail accounts, then they can login with Google and appear here after first login.</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-200">{employees.length} employees</span>
            </div>

            <form onSubmit={handleAddEmployee} className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-[#0b1024] p-4 sm:grid-cols-[1fr_auto]">
              <label className="block text-sm font-bold text-slate-300">
                Employee Gmail
                <input
                  required
                  type="email"
                  value={employeeEmail}
                  onChange={(event) => setEmployeeEmail(event.target.value)}
                  placeholder="employee@gmail.com"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
                />
              </label>
              <button
                type="submit"
                disabled={addingEmployee}
                className="self-end rounded-lg bg-emerald-400 px-5 py-3 font-black text-[#07111f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingEmployee ? "Adding..." : "Add employee"}
              </button>
            </form>

            {isRoleDialogOpen && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5">
                <section className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-2xl shadow-black/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Employee access</p>
                      <h3 className="mt-2 text-2xl font-black text-white">Choose employee role</h3>
                      <p className="mt-2 text-sm text-slate-400">{pendingEmployeeEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRoleDialogOpen(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="py-3 pr-5">Select</th>
                          <th className="py-3 pr-5">Role</th>
                          <th className="py-3 pr-5">Can see</th>
                          <th className="py-3 pr-5">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeRoleOptions.map((roleOption) => (
                          <tr key={roleOption.id} className="border-t border-white/10">
                            <td className="py-4 pr-5">
                              <input
                                type="radio"
                                name="employeeRole"
                                checked={selectedEmployeeRole === roleOption.id}
                                onChange={() => setSelectedEmployeeRole(roleOption.id)}
                                className="h-4 w-4 accent-emerald-400"
                              />
                            </td>
                            <td className="py-4 pr-5 font-black text-white">{roleOption.label}</td>
                            <td className="py-4 pr-5 text-emerald-200">{roleOption.access}</td>
                            <td className="py-4 pr-5 text-slate-400">{roleOption.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRoleDialogOpen(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={addingEmployee}
                      onClick={() => void handleConfirmEmployeeInvite()}
                      className="rounded-lg bg-emerald-400 px-5 py-3 font-black text-[#07111f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingEmployee ? "Saving..." : "Confirm invite"}
                    </button>
                  </div>
                </section>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Registered employees</h3>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{employees.length} active</span>
            </div>

            {usersLoading ? <p className="mt-5 text-slate-400">Loading employees...</p> : employees.length === 0 ? <p className="mt-5 text-slate-400">No registered employees found yet.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Employee</th>
                      <th className="py-3 pr-5">Email</th>
                      <th className="py-3 pr-5">Phone</th>
                      <th className="py-3 pr-5">Roles</th>
                      <th className="py-3 pr-5">Created</th>
                      <th className="py-3 pr-5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.uid} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{employee.name || employee.displayName || "-"}</td>
                        <td className="py-4 pr-5 text-slate-300">{employee.email}</td>
                        <td className="py-4 pr-5 text-slate-300">{employee.phone || "-"}</td>
                        <td className="py-4 pr-5"><div className="flex flex-wrap gap-2">{getUserRoles(employee).map((role) => <AdminRoleBadge key={role} role={role} />)}</div></td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(employee.createdAt)}</td>
                        <td className="py-4 pr-5"><Link to={`/admin-users/${employee.uid}`} className="inline-flex rounded-lg bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-400/20">View profile</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Pending employee invites</h3>
              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">{pendingAdminInvites.length} pending</span>
            </div>

            {invitesLoading ? <p className="mt-5 text-slate-400">Loading invites...</p> : pendingAdminInvites.length === 0 ? <p className="mt-5 text-slate-400">No pending employee invites.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Email</th>
                      <th className="py-3 pr-5">Role</th>
                      <th className="py-3 pr-5">Status</th>
                      <th className="py-3 pr-5">Created</th>
                      <th className="py-3 pr-5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAdminInvites.map((invite) => (
                      <tr key={invite.id} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{invite.email}</td>
                        <td className="py-4 pr-5 text-emerald-200">{getEmployeeRoleLabel(invite.employeeRole)}</td>
                        <td className="py-4 pr-5">
                          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-200">Pending</span>
                        </td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(invite.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <button
                            type="button"
                            disabled={deletingId === invite.id}
                            onClick={() => void handleDeleteInvite(invite)}
                            className="rounded-lg bg-red-500/10 px-3 py-2 font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            {deletingId === invite.id ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "properties" && (
          <section id="properties" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Properties</h2>
                <p className="mt-1 text-sm text-slate-400">Monitor every listing and remove obsolete properties.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search properties</span>
                <input
                  type="search"
                  value={propertySearch}
                  onChange={(event) => setPropertySearch(event.target.value)}
                  placeholder="Search by title, location, status, or owner"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredProperties.length} listings</span>
            </div>
            {propertiesLoading ? <p className="mt-5 text-slate-400">Loading properties...</p> : properties.length === 0 ? <p className="mt-5 text-slate-400">No properties found.</p> : filteredProperties.length === 0 ? <p className="mt-5 text-slate-400">No properties match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Title</th><th className="py-3 pr-5">Location</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Type</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Owner ID</th><th className="py-3 pr-5">Action</th></tr></thead>
                  <tbody>
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{property.title}</td>
                        <td className="py-4 pr-5 text-slate-300">{property.location}</td>
                        <td className="py-4 pr-5 text-slate-300">{formatPrice(property.price)}</td>
                        <td className="py-4 pr-5 text-slate-300">{property.type}</td>
                        <td className="py-4 pr-5">
                          <StatusBadge value={property.displayStatus} />
                        </td>
                        <td className="max-w-48 truncate py-4 pr-5 font-mono text-xs text-slate-500">{property.ownerId}</td>
                        <td className="py-4 pr-5"><button disabled={deletingId === property.id} type="button" onClick={() => void handleDelete(property)} className="rounded-lg bg-red-500/10 px-3 py-2 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60">{deletingId === property.id ? "Deleting..." : "Delete"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "rental-requests" && (
          <section id="rental-requests" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Rental requests</h2>
                <p className="mt-1 text-sm text-slate-400">Rental demand and request outcomes.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search rental requests</span>
                <input
                  type="search"
                  value={requestSearch}
                  onChange={(event) => setRequestSearch(event.target.value)}
                  placeholder="Search by property, tenant, email, or status"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredRequests.length} requests</span>
            </div>
            {requestsLoading ? <p className="mt-5 text-slate-400">Loading rental requests...</p> : requests.length === 0 ? <p className="mt-5 text-slate-400">No rental requests found.</p> : filteredRequests.length === 0 ? <p className="mt-5 text-slate-400">No rental requests match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Property</th><th className="py-3 pr-5">Tenant</th><th className="py-3 pr-5">Email</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Contract</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Created</th><th className="py-3 pr-5">Action</th></tr></thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{request.propertyTitle}</td>
                        <td className="py-4 pr-5 text-slate-300">{request.tenantName}</td>
                        <td className="py-4 pr-5 text-slate-300">{request.tenantEmail}</td>
                        <td className="py-4 pr-5 text-slate-300">{formatPrice(request.propertyPrice)}</td>
                        <td className="py-4 pr-5 text-slate-300">{formatContractYears(request.contractYears)}</td>
                        <td className="py-4 pr-5"><StatusBadge value={request.status} /></td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(request.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <div className="flex flex-wrap gap-2">
                            {request.status === "pending" && (
                              <button
                                disabled={updatingId === request.id}
                                type="button"
                                onClick={() => void handleRejectRequest(request)}
                                className="rounded-lg bg-amber-500/10 px-3 py-2 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              disabled={deletingId === request.id}
                              type="button"
                              onClick={() => void handleDeleteRequest(request)}
                              className="rounded-lg bg-red-500/10 px-3 py-2 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                            >
                              {deletingId === request.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "payments" && (
          <section id="payments" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Payments</h2>
                <p className="mt-1 text-sm text-slate-400">Simulated payment records stored in Firestore.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search payments</span>
                <input
                  type="search"
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder="Search by payment id, tenant, property, or method"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{formatPrice(filteredPaidRevenue)} paid</span>
            </div>
            {paymentsLoading ? <p className="mt-5 text-slate-400">Loading payments...</p> : payments.length === 0 ? <p className="mt-5 text-slate-400">No payments found.</p> : filteredPayments.length === 0 ? <p className="mt-5 text-slate-400">No payments match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1220px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Payment ID</th>
                      <th className="py-3 pr-5">Tenant</th>
                      <th className="py-3 pr-5">Email</th>
                      <th className="py-3 pr-5">Property</th>
                      <th className="py-3 pr-5">Billing Period</th>
                      <th className="py-3 pr-5">Payment Method</th>
                      <th className="py-3 pr-5">Total Paid</th>
                      <th className="py-3 pr-5">Status</th>
                      <th className="py-3 pr-5">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-t border-white/10">
                        <td className="max-w-44 truncate py-4 pr-5 font-mono text-xs text-slate-500" title={payment.id}>{payment.id}</td>
                        <td className="py-4 pr-5 font-semibold text-white">{payment.tenantName}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.tenantEmail}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.propertyTitle}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.billingPeriod}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.paymentMethodType}</td>
                        <td className="py-4 pr-5 font-semibold text-white">{formatPrice(payment.totalPaid)}</td>
                        <td className="py-4 pr-5"><StatusBadge value="approved" /></td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}
        </section>
      </div>
    </main>
  );
}
