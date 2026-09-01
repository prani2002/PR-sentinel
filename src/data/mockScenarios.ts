import { ChangedFile, PullRequestInfo } from '../models/types';
import { ProjectFileSource } from '../analyzer/projectScanner';

export interface PRScenario {
  id: string;
  pr: PullRequestInfo;
  changedFiles: ChangedFile[];
  workspaceFiles: ProjectFileSource[];
}

export const REAL_PR_SCENARIOS: PRScenario[] = [
  {
    id: 'pr-421',
    pr: {
      provider: 'github',
      typeLabel: 'PR',
      owner: 'acme-corp',
      repository: 'payment-gateway',
      number: 421,
      title: 'Update payment status enum from success to completed',
      baseSha: 'a1b2c3d',
      headSha: 'f4e5d6c',
      branchName: 'feature/payment-status',
      baseBranch: 'main',
      author: 'johndoe',
      updatedAt: '2026-09-01T06:30:00Z',
    },
    changedFiles: [
      {
        filename: 'backend/types.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        changes: 2,
        sha: 'b8192a0',
        patch: `@@ -1,5 +1,5 @@
 export type PaymentStatus =
-  | 'success'
+  | 'completed'
   | 'failed'
   | 'pending';`,
      },
    ],
    workspaceFiles: [
      {
        path: 'backend/types.ts',
        content: `export type PaymentStatus =
  | 'completed'
  | 'failed'
  | 'pending';

export interface PaymentRecord {
  id: string;
  amount: number;
  status: PaymentStatus;
}`,
      },
      {
        path: 'frontend/Checkout.tsx',
        content: `import React from 'react';
import { PaymentRecord } from '../backend/types';

export function CheckoutView({ payment }: { payment: PaymentRecord }) {
  const icon = payment.status === 'success' ? '✓' : '✗';

  if (payment.status === 'success') {
    return <div className="p-4 text-green-500">Payment Successful! {icon}</div>;
  }

  return <div className="p-4 text-red-500">Payment Failed</div>;
}`,
      },
      {
        path: 'frontend/PaymentStatus.tsx',
        content: `import React from 'react';
import { PaymentStatus } from '../backend/types';

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  switch (status) {
    case 'failed':
      return <span className="bg-red-500">Failed</span>;
    case 'pending':
      return <span className="bg-yellow-500">Pending</span>;
    default:
      return <span className="bg-gray-500">Unknown</span>;
  }
}`,
      },
      {
        path: 'backend/payment.service.spec.ts',
        content: `import { PaymentRecord } from './types';

describe('Payment Service', () => {
  it('handles valid records', () => {
    const record: PaymentRecord = { id: 'p_1', amount: 100, status: 'completed' };
    expect(record.status).toBe('completed');
  });
});`,
      },
    ],
  },
  {
    id: 'gitlab-mr-1042',
    pr: {
      provider: 'gitlab',
      typeLabel: 'MR',
      projectPath: 'gitlab-org/telemetry-engine',
      owner: 'gitlab-org',
      repository: 'telemetry-engine',
      number: 1042,
      title: 'Deprecate TrackEventType trackSession in favor of captureEvent',
      baseSha: '67a89b',
      headSha: '11c22d',
      branchName: 'refactor/telemetry-events',
      baseBranch: 'main',
      author: 'alex_gitlab',
      updatedAt: '2026-09-01T04:20:00Z',
    },
    changedFiles: [
      {
        filename: 'packages/telemetry/events.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        changes: 2,
        sha: 'fe8192a',
        patch: `@@ -1,4 +1,4 @@
 export type TrackEventType =
-  | 'trackSession'
+  | 'captureEvent'
   | 'pageView'
   | 'errorLog';`,
      },
    ],
    workspaceFiles: [
      {
        path: 'packages/telemetry/events.ts',
        content: `export type TrackEventType =
  | 'captureEvent'
  | 'pageView'
  | 'errorLog';

export interface TelemetryPayload {
  eventType: TrackEventType;
  timestamp: number;
}`,
      },
      {
        path: 'apps/web/SessionTracker.tsx',
        content: `import React from 'react';
import { TelemetryPayload } from '../telemetry/events';

export function SessionTracker({ payload }: { payload: TelemetryPayload }) {
  if (payload.eventType === 'trackSession') {
    return <div className="text-xs text-blue-400">Tracking Active Session</div>;
  }
  return <div className="text-xs text-zinc-400">Standard Event</div>;
}`,
      },
    ],
  },
  {
    id: 'pr-512',
    pr: {
      provider: 'github',
      typeLabel: 'PR',
      owner: 'acme-corp',
      repository: 'payment-gateway',
      number: 512,
      title: 'Rename UserProfile interface property name to fullName',
      baseSha: '987abc',
      headSha: '456def',
      branchName: 'refactor/user-profile-naming',
      baseBranch: 'main',
      author: 'sarah_dev',
      updatedAt: '2026-09-01T05:15:00Z',
    },
    changedFiles: [
      {
        filename: 'shared/user.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        changes: 2,
        sha: '9921ab',
        patch: `@@ -1,4 +1,4 @@
 export interface UserProfile {
   id: string;
-  name: string;
+  fullName: string;
   email: string;
 }`,
      },
    ],
    workspaceFiles: [
      {
        path: 'shared/user.ts',
        content: `export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
}`,
      },
      {
        path: 'frontend/UserProfileCard.tsx',
        content: `import React from 'react';
import { UserProfile } from '../shared/user';

export function UserProfileCard({ user }: { user: UserProfile }) {
  return (
    <div className="card">
      <h2>{user.id}</h2>
      <p>{user.email}</p>
    </div>
  );
}`,
      },
    ],
  },
];
