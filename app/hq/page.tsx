import { Shell } from "@/components/Shell";
import { HQDashboard } from "@/components/HQDashboard";
import { HQModerationQueue } from "@/components/HQModerationQueue";
import { HQAuditLog } from "@/components/HQAuditLog";
import { HQHostApplications } from "@/components/HQHostApplications";
import { HQFinance } from "@/components/HQFinance";
import { HQTrustSafety } from "@/components/HQTrustSafety";
import { HQCoOwners } from "@/components/HQCoOwners";
import { HQPayoutQueue } from "@/components/HQPayoutQueue";
import { HQSystemHealth } from "@/components/HQSystemHealth";
import { HQBattleEconomy } from "@/components/HQBattleEconomy";
import { HQSupportQueue } from "@/components/HQSupportQueue";
export default function HQ(){return <Shell><section className="page"><span className="eyebrow">Private · Owner HQ</span><h1>Command Center</h1><p className="lede">Operational controls for authorized OUTSiiDE staff. Access is checked server-side; regular users do not receive HQ data.</p><HQDashboard/><HQSystemHealth/><HQBattleEconomy/><HQSupportQueue/><HQCoOwners/><HQHostApplications/><HQTrustSafety/><HQPayoutQueue/><HQFinance/><HQModerationQueue/><HQAuditLog/><div className="hqSections"><span>Users</span><span>Creators</span><span>Content</span><span>Live</span><span>Porch</span><span>Circles</span><span>Moderation</span><span>Reports</span><span>Appeals</span><span>Revenue</span><span>Payouts</span><span>Audit Logs</span><span>System Health</span><span>Security</span></div></section></Shell>}
