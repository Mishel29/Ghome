import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CampaignDashboard } from "../../api/schemaTypes";
import { useQuery } from "../../api/useQuery";
import AdminDashboard from "./Dashboard";

vi.mock("../../api/useQuery", () => ({ useQuery: vi.fn() }));
vi.mock("../../components/AdminUI", () => ({
  AdminPage: ({ title, children }: { title: string; children: React.ReactNode }) => <main><h1>{title}</h1>{children}</main>,
  Feedback: () => null,
}));
vi.mock("recharts", () => ({
  Bar: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
  BarChart: ({ data, children }: { data: unknown; children: React.ReactNode }) => <div data-testid="daily-bar-chart" data-points={JSON.stringify(data)}>{children}</div>,
}));

const dashboard: CampaignDashboard = {
  summary: { sent: 12, failed: 1, clicks: 3, saves: 2, interests: 1, unsubscribes: 0, ctr: 0.25, interestRate: 1 / 12 },
  days: [{ date: "2026-09-20", sent: 12, failed: 1, clicks: 3, saves: 2, interests: 1, unsubscribes: 0 }],
  campaigns: [
    { campaignId: "campaign-older", campaignName: "Older campaign", sentAt: "2026-09-18T10:00:00.000Z", recipients: 10, sent: 10, failed: 0, clicks: 1, saves: 0, interests: 0, unsubscribes: 0, ctr: 0.1, interestRate: 0 },
    { campaignId: "campaign-newer", campaignName: "Newer campaign", sentAt: "2026-09-20T10:00:00.000Z", recipients: 2, sent: 2, failed: 1, clicks: 2, saves: 2, interests: 1, unsubscribes: 0, ctr: 1, interestRate: 0.5 },
  ],
};

describe("AdminDashboard", () => {
  afterEach(() => cleanup());

  it("renders campaign KPIs, daily grouped data, funnel, and sortable campaign rows", async () => {
    vi.mocked(useQuery).mockReturnValue({ data: { campaignDashboard: dashboard }, loading: false, error: "", reload: vi.fn() });
    const user = userEvent.setup();
    render(<AdminDashboard />);

    expect(screen.getByText("Emails sent")).toBeTruthy();
    expect(screen.getByLabelText("Campaign performance summary").textContent).toContain("12");
    expect(screen.getByText("25.0%")).toBeTruthy();
    expect(screen.getByText("Conversion funnel")).toBeTruthy();
    expect(screen.getByTestId("daily-bar-chart").getAttribute("data-points")).toContain('"saves":2');
    expect(screen.getAllByRole("row")[1].textContent).toContain("Newer campaign");

    await user.click(screen.getByRole("button", { name: /Clicks/ }));
    expect(screen.getAllByRole("row")[1].textContent).toContain("Newer campaign");
    await user.click(screen.getByRole("button", { name: /Clicks/ }));
    expect(screen.getAllByRole("row")[1].textContent).toContain("Older campaign");
  });
});
