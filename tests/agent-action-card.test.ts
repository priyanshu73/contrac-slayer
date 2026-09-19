import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

// Initialize JSDOM environment for browser component testing
const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost:3000",
});
global.window = dom.window as any;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
global.cancelAnimationFrame = (id: number) => clearTimeout(id);

// Set required environment variable for api.ts initialization
process.env.NEXT_PUBLIC_CONTRACTOR_AI_API_URL = "http://localhost:8000";

import { render, fireEvent, cleanup } from "@testing-library/react";

// Import REAL components and types directly from the codebase
import { AgentActionCard } from "../components/agent-action-card";
import { AgentChatPanel } from "../components/agent-chat-panel";
import type { Message, ActionCardOption } from "../components/agent-chat-panel";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NextIntlClientProvider } from "next-intl";

describe("Agent Action Card Component Tests (Real React Components)", () => {
  after(() => {
    cleanup();
  });

  const sampleMessage: Message = {
    id: "msg-101",
    role: "assistant",
    content: "I have prepared the quote for Jane Doe. Please review and approve:",
    actionCard: {
      action: "send_quote_email",
      title: "Send Quote #1042 to Jane Doe",
      description: "Amount: $4,500.00 | Email: jane.doe@example.com",
      commandId: 42,
      approvalToken: "tok_secure_approval_123",
      status: "pending",
      options: [
        {
          id: "approve-action",
          label: "Approve & Send",
          prompt: "Approve this action",
          style: "primary",
        },
        {
          id: "reject-action",
          label: "Reject",
          prompt: "Reject this action",
          style: "secondary",
        },
      ],
    },
  };

  it("renders the real AgentActionCard with options and dispatches approval on click", async () => {
    const clickedOptions: ActionCardOption[] = [];
    const handleActionClick = (msg: Message, opt: ActionCardOption) => {
      clickedOptions.push(opt);
    };

    const { getByTestId } = render(
      React.createElement(AgentActionCard, {
        message: sampleMessage,
        executingCommandId: null,
        isLoading: false,
        onActionClick: handleActionClick,
      })
    );

    // Verify rendered title and description
    const title = getByTestId("action-card-title");
    assert.equal(title.textContent?.trim(), "Send Quote #1042 to Jane Doe");

    const desc = getByTestId("action-card-description");
    assert.match(desc.textContent || "", /\$4,500\.00/);

    // Click Approve button
    const approveBtn = getByTestId("action-card-button-approve-action");
    assert.equal(approveBtn.hasAttribute("disabled"), false);
    fireEvent.click(approveBtn);

    assert.equal(clickedOptions.length, 1);
    assert.equal(clickedOptions[0].id, "approve-action");
    assert.equal(clickedOptions[0].prompt, "Approve this action");

    cleanup();
  });

  it("renders the real AgentActionCard and dispatches rejection on cancel click", async () => {
    const clickedOptions: ActionCardOption[] = [];
    const handleActionClick = (msg: Message, opt: ActionCardOption) => {
      clickedOptions.push(opt);
    };

    const { getByTestId } = render(
      React.createElement(AgentActionCard, {
        message: sampleMessage,
        executingCommandId: null,
        isLoading: false,
        onActionClick: handleActionClick,
      })
    );

    const rejectBtn = getByTestId("action-card-button-reject-action");
    assert.equal(rejectBtn.hasAttribute("disabled"), false);
    fireEvent.click(rejectBtn);

    assert.equal(clickedOptions.length, 1);
    assert.equal(clickedOptions[0].id, "reject-action");
    assert.equal(clickedOptions[0].prompt, "Reject this action");

    cleanup();
  });

  it("prevents duplicate clicks by disabling buttons and showing executing state", async () => {
    const clickedOptions: ActionCardOption[] = [];
    const handleActionClick = (msg: Message, opt: ActionCardOption) => {
      clickedOptions.push(opt);
    };

    // Render with executingCommandId matching the card's commandId (42)
    const { getByTestId } = render(
      React.createElement(AgentActionCard, {
        message: sampleMessage,
        executingCommandId: 42,
        isLoading: false,
        onActionClick: handleActionClick,
      })
    );

    const approveBtn = getByTestId("action-card-button-approve-action");
    assert.equal(approveBtn.hasAttribute("disabled"), true);
    assert.equal(approveBtn.textContent?.trim(), "Executing...");

    const rejectBtn = getByTestId("action-card-button-reject-action");
    assert.equal(rejectBtn.hasAttribute("disabled"), true);

    // Attempt to fire click while executing
    fireEvent.click(approveBtn);
    assert.equal(clickedOptions.length, 0, "No action should be dispatched while button is executing/disabled");

    cleanup();
  });

  it("renders status badge when action card is completed or replayed", async () => {
    const completedMessage: Message = {
      ...sampleMessage,
      actionCard: {
        ...sampleMessage.actionCard!,
        // The approval API returns this value in uppercase.
        status: "COMPLETED" as any,
        replayed: true,
      },
    };

    const { getByTestId, queryByTestId } = render(
      React.createElement(AgentActionCard, {
        message: completedMessage,
        executingCommandId: null,
        isLoading: false,
        onActionClick: () => {},
      })
    );

    const badge = getByTestId("action-card-approved");
    assert.ok(badge);
    assert.match(badge.textContent || "", /✓ Action Approved/);

    const replayed = getByTestId("action-card-replayed");
    assert.ok(replayed);
    assert.equal(replayed.textContent?.trim(), "(Replayed)");

    // No interactive buttons should be present when completed
    assert.equal(queryByTestId("action-card-button-approve-action"), null);

    cleanup();
  });

  it("renders status badge when action card is cancelled/rejected", async () => {
    const rejectedMessage: Message = {
      ...sampleMessage,
      actionCard: {
        ...sampleMessage.actionCard!,
        status: "rejected",
      },
    };

    const { getByTestId, queryByTestId } = render(
      React.createElement(AgentActionCard, {
        message: rejectedMessage,
        executingCommandId: null,
        isLoading: false,
        onActionClick: () => {},
      })
    );

    const badge = getByTestId("action-card-cancelled");
    assert.ok(badge);
    assert.match(badge.textContent || "", /✕ Action Cancelled/);
    assert.equal(queryByTestId("action-card-button-approve-action"), null);

    cleanup();
  });

  it("offers View Project after a completed project command", () => {
    const viewed: string[] = [];
    const projectMessage: Message = {
      ...sampleMessage,
      actionCard: {
        ...sampleMessage.actionCard!,
        action: "create_project",
        status: "COMPLETED" as any,
        result: { entity: { project_id: 314, title: "David Butler Project" } },
      },
    };

    const { getByTestId } = render(
      React.createElement(AgentActionCard, {
        message: projectMessage,
        executingCommandId: null,
        onActionClick: () => {},
        onViewProject: (projectId) => viewed.push(projectId),
      })
    );

    fireEvent.click(getByTestId("action-card-view-project"));
    assert.deepEqual(viewed, ["314"]);
    cleanup();
  });

  it("lets the contractor edit a project name before approving", () => {
    const approvals: Message[] = [];
    const projectMessage: Message = {
      ...sampleMessage,
      actionCard: {
        ...sampleMessage.actionCard!,
        action: "create_project",
        entity: { title: "Johnson Project" },
        status: "pending",
      },
    };

    const { getByTestId } = render(
      React.createElement(AgentActionCard, {
        message: projectMessage,
        executingCommandId: null,
        onActionClick: (message) => {
          approvals.push(message);
        },
      })
    );

    const title = getByTestId("action-card-project-title") as HTMLInputElement;
    assert.equal(title.value, "Johnson Project");
    fireEvent.input(title, { target: { value: "Johnson Kitchen Remodel" } });
    assert.equal(title.value, "Johnson Kitchen Remodel");
    fireEvent.click(getByTestId("action-card-button-approve-action"));

    assert.equal(approvals.length, 1);
    assert.deepEqual(approvals[0].actionCard?.editedPayload, {
      title: "Johnson Kitchen Remodel",
    });
    cleanup();
  });

  it("mounts the full AgentChatPanel real component in JSDOM with zero runtime errors", async () => {
    const mockRouter = {
      back: () => {},
      forward: () => {},
      refresh: () => {},
      push: () => {},
      replace: () => {},
      prefetch: () => {},
    };

    const routerElement = React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter as any },
      React.createElement(AgentChatPanel)
    );

    const tree = React.createElement(NextIntlClientProvider, {
      locale: "en",
      messages: {},
      children: routerElement,
    });

    const result = render(tree);
    assert.ok(result.container.firstChild, "AgentChatPanel must render root node");

    const panelRoot = result.container.querySelector("div");
    assert.ok(panelRoot, "AgentChatPanel DOM container must be rendered");

    cleanup();
  });
});
