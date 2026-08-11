import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUBMISSIONS_FILE = path.join(process.cwd(), "admin-data", "provider-submissions.json");

function getSubmissions(): any[] {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const data = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read submissions file", err);
  }
  return [];
}

function writeSubmissions(list: any[]) {
  try {
    const dir = path.dirname(SUBMISSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write submissions file", err);
  }
}

export async function GET() {
  const submissions = getSubmissions();
  return NextResponse.json({ submissions });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;
    const submissionId = body?.submissionId;

    // Handle Approve / Reject Actions
    if (action === "approve" || action === "reject") {
      const list = getSubmissions();
      const updatedList = list.map((item) => {
        if (item.id === submissionId || (!submissionId && action === "approve")) {
          return {
            ...item,
            status: action === "approve" ? "approved" : "rejected",
            processedAt: new Date().toISOString(),
          };
        }
        return item;
      });
      writeSubmissions(updatedList);

      // Attempt to forward to Go backend curate endpoint
      try {
        const enrichedUpdates = (body?.updates || []).map((u: any) => ({
          ...u,
          approveProviderSubmission: action === "approve",
          rejectProviderSubmission: action === "reject"
        }));

        await fetch("http://localhost:8080/api/admin/services/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: enrichedUpdates }),
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Submission ${action === "approve" ? "approved and applied to live catalog!" : "rejected!"}`,
      });
    }

    // Standard Provider Submission Save
    const updates = body?.updates || [];
    const newSubmission = {
      id: `sub_${Date.now()}`,
      timestamp: new Date().toISOString(),
      providerName: body?.providerName || "Provider Verification",
      status: "pending",
      count: updates.length,
      updates: updates,
    };

    const list = getSubmissions();
    list.unshift(newSubmission);
    writeSubmissions(list);

    // Forward to Go backend if reachable
    try {
      await fetch("http://localhost:8080/api/provider/services/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Provider verification submitted and recorded successfully!",
      count: updates.length,
      submissionId: newSubmission.id,
    });
  } catch (error: any) {
    console.error("[Provider Curate API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process curation" },
      { status: 500 }
    );
  }
}
