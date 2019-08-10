import { ZBClient } from '../..'

describe('ZBWorker', () => {
	let wfi
	const zbc = new ZBClient('0.0.0.0:26500')

	afterAll(() => {
		zbc.cancelWorkflowInstance(wfi)
		zbc.close()
	})

	it('Can raise an Operate incident with complete.failure()', async done => {
		const res = await zbc.deployWorkflow(
			'./src/__tests__/testdata/raise-incident.bpmn'
		)
		expect(res.workflows.length).toBe(1)
		expect(res.workflows[0].bpmnProcessId).toBe('raise-incident')

		const wf = await zbc.createWorkflowInstance('raise-incident', {
			conditionVariable: true,
		})
		wfi = wf.workflowInstanceKey
		expect(wfi).toBeTruthy()

		await zbc.setVariables({
			elementInstanceKey: wfi,
			local: false,
			variables: {
				conditionVariable: false,
			},
		})

		await zbc.createWorker(
			'test2',
			'wait-raise-incident',
			async (job, complete) => {
				expect(job.workflowInstanceKey).toBe(wfi)
				complete.success(job)
			}
		)

		await zbc.createWorker(
			'test2',
			'pathB-raise-incident',
			async (job, complete) => {
				expect(job.workflowInstanceKey).toBe(wfi)
				expect(job.variables.conditionVariable).toBe(false)
				complete.failure('Raise an incident in Operate', 0)
				// Manually verify that an incident has been raised
				done()
			}
		)
	})
})
