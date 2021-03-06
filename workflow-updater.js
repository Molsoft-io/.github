const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const workflows = fs.readdirSync('./workflow-templates');
const workflowsContent = [];
workflows.forEach(workflow => {
  workflowsContent.push(fs.readFileSync(`./workflow-templates/${workflow}`, { encoding: 'utf8' }));
});

(async () => {
  const personal_access_token = process.argv.slice(2)[0];
  const octokit = new Octokit({
    auth: personal_access_token,
  });

  const org = 'Molsoft-io';
  const { data: repos } = await octokit.repos.listForOrg({ org, per_page: 100 });

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];

    try {
      const { data: projectWorkflows } = await octokit.repos.getContent({
        owner: org,
        repo: repo.name,
        path: '/.github/workflows',
        ref: "Development"
      });


      const { data: branches } = await octokit.repos.listBranches({
        owner: org,
        repo: repo.name,
      });

      const containsMaster = branches.find(branch => branch.name === "master");

      for (let i = 0; i < workflows.length; i++) {
        const workflow = workflows[i];

        const matchingWorkflow = projectWorkflows.find(projectWorkflow => projectWorkflow.name === workflow);
        const workflowUpdate = containsMaster ? workflowsContent[i].replace(/main/g, 'master') : workflowsContent[i];
        
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner: org,
            repo: repo.name,
            path: `.github/workflows/${workflow}`,
            message: "UPDATED WORKFLOW",
            branch: "Development",
            content: Buffer.from(workflowUpdate).toString('base64'),
            sha: matchingWorkflow.sha,
            committer: {
              name: "Workflow updater",
              email: "hello@molsoft.io"
            },
            author: {
              name: "Workflow updater",
              email: "hello@molsoft.io"
            }
          });
        }
        catch (e) {
          console.log("fail workflow: ", workflow, repo.name, e.status);
          console.log(workflow, matchingWorkflow);
          console.log(e);
        }
      }

      // await octokit.issues.createLabel({
      //   owner: org,
      //   repo: repo.name,
      //   name: "QA",
      //   color: "fbc02d",
      //   description: "Task is in QA (adding this label will trigger a preview build)"
      // });


    }
    catch (e) {
      console.log("fail: ", repo.name, e.status)
    }
  }



  // for(let repo of repos.data) {
  //   try {
  //     console.log(`Adding: ${repo.name}`);
  //     octokit.teams.addOrUpdateRepoPermissionsInOrg({
  //       org: org,
  //       team_slug: 'devs',
  //       owner: org,
  //       repo: repo.name,
  //       permission: "push"
  //     });
  //   } catch (e) {
  //     console.error(e.message);
  //   }
  // }
})()


