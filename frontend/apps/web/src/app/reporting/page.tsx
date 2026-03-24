"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Calendar, Search } from "lucide-react";

type ReportType = "executive" | "scheduled" | "ondemand";

type ScheduledForm = {
  reportType: string;
  frequency: string;
  assets: string;
  date: string;
  time: string;
  email: string;
};

export default function ReportingPage() {
  const [activeType, setActiveType] = useState<ReportType>("executive");
  const [sections, setSections] = useState({
    discovery: true,
    inventory: true,
    cbom: true,
    posture: true,
    cyberRating: true,
  });

  const { register, handleSubmit } = useForm<ScheduledForm>();

  function onSchedule(data: ScheduledForm) {
    alert(`Report scheduled: ${JSON.stringify(data, null, 2)}`);
  }

  const reportTypes: { type: ReportType; label: string; icon: typeof Users; desc: string }[] = [
    { type: "executive", label: "Executives Reporting",  icon: Users,    desc: "High-level summary for leadership" },
    { type: "scheduled", label: "Scheduled Reporting",   icon: Calendar, desc: "Automated reports on a schedule"   },
    { type: "ondemand",  label: "On-Demand Reporting",   icon: Search,   desc: "Generate reports as needed"        },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and schedule cryptographic posture reports
        </p>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-3 gap-6">
        {reportTypes.map(({ type, label, icon: Icon, desc }) => (
          <Card
            key={type}
            className={`cursor-pointer transition-all ${
              activeType === type
                ? "ring-2 ring-[#8B1A1A] bg-[#8B1A1A]/5"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveType(type)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                activeType === type ? "bg-[#8B1A1A]/10" : "bg-gray-100"
              }`}>
                <Icon className={`h-6 w-6 ${activeType === type ? "text-[#8B1A1A]" : "text-gray-400"}`} />
              </div>
              <div className="font-semibold text-gray-900 text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled form */}
      {activeType === "scheduled" && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Schedule Reporting
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-500">Enable Schedule</span>
                <div className="w-10 h-5 bg-amber-500 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
            </h2>
            <form onSubmit={handleSubmit(onSchedule)}>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Report Type</Label>
                    <select
                      {...register("reportType")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option>Executive Summary Report</option>
                      <option>CBOM Full Report</option>
                      <option>PQC Posture Report</option>
                      <option>Cyber Rating Report</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <select
                      {...register("frequency")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option>Weekly</option>
                      <option>Daily</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Select Assets</Label>
                    <select
                      {...register("assets")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option>All Assets</option>
                      <option>High Risk Only</option>
                      <option>PQC Not Ready</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Include Sections</Label>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(sections).map(([key, checked]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={v =>
                              setSections(s => ({ ...s, [key]: v as boolean }))
                            }
                          />
                          <span className="text-sm capitalize text-gray-600">
                            {key === "cyberRating" ? "Cyber Rating" : key.charAt(0).toUpperCase() + key.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" {...register("date")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time (IST)</Label>
                    <Input type="time" {...register("time")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Delivery Email</Label>
                    <Input
                      type="email"
                      placeholder="executives@pnb.bank.in"
                      {...register("email")}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Schedule Report
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* On demand form */}
      {activeType === "ondemand" && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              On-Demand Reporting
              <span className="text-sm font-normal text-gray-500 ml-1">Request reports as needed</span>
            </h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Report Type</Label>
                {[
                  "Executive Reporting",
                  "Assets Discovery",
                  "Assets Inventory",
                  "CBOM",
                  "Posture of PQC",
                  "Cyber Rating (Tiers 1-4)",
                ].map(type => (
                  <div key={type} className="flex items-center gap-2 text-sm text-gray-700 py-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500" />
                    {type}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Send via Email</Label>
                  <Input type="email" placeholder="Enter email address" />
                </div>
                <div className="space-y-1.5">
                  <Label>Save to Location</Label>
                  <Input defaultValue="/Reports/OnDemand/" />
                </div>
                <div className="space-y-1.5">
                  <Label>File Format</Label>
                  <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <option>PDF</option>
                    <option>Excel</option>
                    <option>JSON</option>
                  </select>
                </div>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive summary */}
      {activeType === "executive" && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Executive Summary</h2>
            <p className="text-sm text-gray-600 mb-6">
              This report provides a high-level overview of the organisation's quantum migration readiness
              for leadership and board-level stakeholders.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Scope",        value: "All public-facing assets"               },
                { label: "Standard",     value: "NIST IR 8547 ipd (November 2024)"       },
                { label: "Horizon",      value: "2030 deprecation / 2035 disallowed"     },
                { label: "Methodology",  value: "QMRS scoring with runway calculation"   },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
            <Button className="mt-6 bg-amber-500 hover:bg-amber-600 text-white">
              Download Executive Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}