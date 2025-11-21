import React from "react";

export function ProjectManagementCard() {
  const rows = [
    {
      id: 1,
      name: "Install patio pavers",
      assignee: "Miguel Cruz",
      status: "Scheduled",
      due: "2025-06-12",
      project: "Backyard Renovation",
      color: "green",
    },
    {
      id: 2,
      name: "Build retaining wall (Oak St.)",
      assignee: "Sam Patel",
      status: "In Progress",
      due: "2025-06-20",
      project: "Retaining Wall - Oak St",
      color: "blue",
    },
    {
      id: 3,
      name: "Landscape front yard (sod + plants)",
      assignee: "Jasmine Lee",
      status: "Needs Review",
      due: "2025-06-08",
      project: "Front Yard Refresh",
      color: "yellow",
    },
    {
      id: 4,
      name: "Replace driveway (gravel → asphalt)",
      assignee: "Tom Nguyen",
      status: "Pending",
      due: "2025-06-30",
      project: "Driveway Replacement",
      color: "gray",
    },
    {
      id: 5,
      name: "Install irrigation system",
      assignee: "Crew A",
      status: "In Progress",
      due: "2025-07-05",
      project: "Irrigation Upgrade",
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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Filter by:</span>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">👤 Assignee</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">ℹ️ Status</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">📅 Due Date</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm">📁 Project</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3 py-2 rounded-md border border-gray-200 text-sm bg-white">Import</button>
          <button className="px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-semibold">+ Add New Task</button>
        </div>
      </div>

      <div className="grid grid-cols-[3fr_1.4fr_1fr_0.9fr_1.2fr] bg-gray-50 text-gray-600 text-sm px-4 py-3 border-t border-b border-gray-200">
        <div className="font-medium">Task Name</div>
        <div className="font-medium">Assignee</div>
        <div className="font-medium text-center">Status</div>
        <div className="font-medium">Due Date</div>
        <div className="font-medium">Project</div>
      </div>

      <div className="flex-1 overflow-auto">
        {rows.map((r, idx) => (
          <div
            key={r.id}
            className={`grid grid-cols-[3fr_1.4fr_1fr_0.9fr_1.2fr] gap-4 items-center px-4 py-4 hover:bg-gray-50 ${idx < rows.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <div className="flex items-start gap-3 font-medium text-gray-800">
              <span className={`inline-block w-3 h-3 rounded-full ${statusBg(r.color)}`}></span>
              <span className="truncate block">{r.name}</span>
            </div>
            <div className="text-gray-700 whitespace-normal text-sm">{r.assignee}</div>
            <div className="flex items-center justify-center">
              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">{r.status}</span>
            </div>
            <div className="text-gray-700">{r.due}</div>
            <div className="text-gray-700 truncate">{r.project}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectManagementCard;
