"use client";

import React from "react";
import { useTranslations } from "next-intl";

export function ProjectManagementCard() {
  const t = useTranslations("landing");
  const rows = [
    {
      id: 1,
      name: t("pmTask1"),
      assignee: "Miguel Cruz",
      status: t("pmStatusScheduled"),
      due: "2025-06-12",
      project: t("pmProject1"),
      color: "green",
    },
    {
      id: 2,
      name: t("pmTask2"),
      assignee: "Sam Patel",
      status: t("pmStatusInProgress"),
      due: "2025-06-20",
      project: t("pmProject2"),
      color: "blue",
    },
    {
      id: 3,
      name: t("pmTask3"),
      assignee: "Jasmine Lee",
      status: t("pmStatusNeedsReview"),
      due: "2025-06-08",
      project: t("pmProject3"),
      color: "yellow",
    },
    {
      id: 4,
      name: t("pmTask4"),
      assignee: "Tom Nguyen",
      status: t("pmStatusPending"),
      due: "2025-06-30",
      project: t("pmProject4"),
      color: "gray",
    },
    {
      id: 5,
      name: t("pmTask5"),
      assignee: "Crew A",
      status: t("pmStatusInProgress"),
      due: "2025-07-05",
      project: t("pmProject5"),
      color: "blue",
    },
  ];

  const statusBg = (c: string) => {
    switch (c) {
      case "green":
        return "bg-green-500";
      case "blue":
        return "bg-blue-500";
      case "yellow":
        return "bg-yellow-400";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusStyles = (status: string) => {
    if (status === t("pmStatusScheduled")) return "bg-blue-50 text-blue-700 border border-blue-200";
    if (status === t("pmStatusInProgress")) return "bg-purple-50 text-purple-700 border border-purple-200";
    if (status === t("pmStatusNeedsReview")) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    if (status === t("pmStatusPending")) return "bg-gray-50 text-gray-700 border border-gray-200";
    return "bg-gray-50 text-gray-700 border border-gray-200";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{t("pmFilterBy")}</span>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">👤 {t("pmAssignee")}</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">ℹ️ {t("pmStatus")}</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">📅 {t("pmDueDate")}</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">📁 {t("pmProject")}</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3 py-2 rounded-md border border-gray-200 text-sm bg-white">{t("pmImport")}</button>
          <button className="px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-semibold">{t("pmAddNewTask")}</button>
        </div>
      </div>

      <div className="grid grid-cols-[2.5fr_1.4fr_1.8fr_1fr_1.5fr] bg-gray-50 text-gray-600 text-sm px-4 py-3 border-t border-b border-gray-200">
        <div className="font-medium">{t("pmTaskName")}</div>
        <div className="font-medium">{t("pmAssignee")}</div>
        <div className="font-medium text-center">{t("pmStatus")}</div>
        <div className="font-medium">{t("pmDueDate")}</div>
        <div className="font-medium">{t("pmProject")}</div>
      </div>

      <div className="flex-1 overflow-auto">
        {rows.map((r, idx) => (
          <div
            key={r.id}
            className={`grid grid-cols-[2.5fr_1.4fr_1.8fr_1fr_1.5fr] gap-4 items-center px-4 py-4 hover:bg-gray-50 ${idx < rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <div className="flex items-center gap-3 font-medium text-gray-800 min-w-0">
              <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${statusBg(r.color)}`}></span>
              <span className="truncate">{r.name}</span>
            </div>
            <div className="text-gray-700 whitespace-nowrap text-sm">{r.assignee}</div>
            <div className="flex items-center justify-center min-w-0">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${getStatusStyles(r.status)}`}>{r.status}</span>
            </div>
            <div className="text-gray-700 whitespace-nowrap">{r.due}</div>
            <div className="text-gray-700 truncate">{r.project}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectManagementCard;
