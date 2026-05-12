/**
 * Test for GitHub Status Checker
 */

import {
  analyzeWorkflowHealth,
  generateStatusReport
} from '../../../scripts/check-github-status.js';

// Mock console.log to capture output
let logOutput = [];
 
 
// eslint-disable-next-line no-console
const originalLog = console.log;
// eslint-disable-next-line no-console
console.log = (...args) => {
  logOutput.push(args.join(' '));
};

describe('GitHub Status Checker', () => {
  beforeEach(() => {
    logOutput = [];
  });

 

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log = originalLog;
  });

  test('should analyze workflow health', () => {
    const mockRuns = [
      { conclusion: 'success', status: 'completed' },
      { conclusion: 'failure', status: 'completed' },
      { conclusion: 'success', status: 'completed' },
      { status: 'in_progress' }
    ];

    const result = analyzeWorkflowHealth(mockRuns);

    // Should have some output
    expect(logOutput.length).toBeGreaterThan(0);

    // Should return analysis object
    expect(result).toHaveProperty('total', 4);
    expect(result).toHaveProperty('success', 2);
    expect(result).toHaveProperty('failure', 1);
    expect(result).toHaveProperty('inProgress', 1);
  });

  test('should generate status report', () => {
    const mockBranchInfo = {
      total: 5,
      default: 'main',
      branches: [
        { name: 'main', protected: true },
        { name: 'develop', protected: false }
      ]
    };

    const mockWorkflows = [
      { id: 1, name: 'CI', state: 'active' },
      { id: 2, name: 'Deploy', state: 'active' }
    ];

    const mockRuns = [
      { conclusion: 'success' },
      { conclusion: 'failure' }
    ];

    const mockAnalysis = {
      total: 2,
      success: 1,
      failure: 1
    };

    generateStatusReport(mockBranchInfo, mockWorkflows, mockRuns, mockAnalysis);

    // Should have some output
    expect(logOutput.length).toBeGreaterThan(0);

    // Should mention branch status
    const branchStatus = logOutput.find(line =>
      line.includes('Branch Status') || line.includes('Branch information')
    );
    expect(branchStatus).toBeDefined();

    // Should mention workflow status
    const workflowStatus = logOutput.find(line =>
      line.includes('Workflow Status') || line.includes('workflows')
    );
    expect(workflowStatus).toBeDefined();
  });

  test('should handle empty workflow health analysis', () => {
    const emptyRuns = [];

    const result = analyzeWorkflowHealth(emptyRuns);

    // Should handle empty array gracefully
    expect(result).toHaveProperty('total', 0);
    expect(result).toHaveProperty('success', 0);
    expect(result).toHaveProperty('failure', 0);
    expect(result).toHaveProperty('inProgress', 0);
  });

  test('should handle null branch info in status report', () => {
    const nullBranchInfo = null;
    const mockWorkflows = [];
    const mockRuns = [];
    const mockAnalysis = { total: 0, success: 0, failure: 0 };

    // Should not throw error with null branch info
    expect(() => {
      generateStatusReport(nullBranchInfo, mockWorkflows, mockRuns, mockAnalysis);
    }).not.toThrow();
  });
});
