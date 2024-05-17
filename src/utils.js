export const fetchDetails = async (url, token) => {
  let prApiUrl, compareUrl, diffUrl;

  // Check if the URL is a PR URL
  const prUrlParts = url.match(
    /https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (prUrlParts) {
    const baseOwner = prUrlParts[1];
    const baseRepo = prUrlParts[2];
    const prNumber = prUrlParts[3];

    prApiUrl = `https://api.github.com/repos/${baseOwner}/${baseRepo}/pulls/${prNumber}`;
    diffUrl = `https://api.github.com/repos/${baseOwner}/${baseRepo}/pulls/${prNumber}.diff`;
  }
  // Check if the URL is a compare URL
  else {
    const compareUrlParts = url.match(
      /https:\/\/github\.com\/([^/]+)\/([^/]+)\/compare\/([^...]+)...([^:]+):([^?]+)/
    );
    if (!compareUrlParts) {
      throw new Error('Invalid URL');
    }

    const baseOwner = compareUrlParts[1];
    const baseRepo = compareUrlParts[2];
    const baseBranch = compareUrlParts[3];
    const headOwner = compareUrlParts[4];
    const headBranch = compareUrlParts[5];

    compareUrl = `https://api.github.com/repos/${baseOwner}/${baseRepo}/compare/${baseBranch}...${headOwner}:${headBranch}`;
    console.log('=>(set-github-autofill.ts:43) compareUrl', compareUrl);
  }

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    let compareData;
    if (compareUrl) {
      const compareResponse = await fetch(compareUrl, { headers });
      compareData = await compareResponse.json();
    }

    let diffContent;
    if (diffUrl) {
      const diffResponse = await fetch(diffUrl, {
        headers: {
          ...headers,
          Accept: 'application/vnd.github.v3.diff',
        },
      });
      if (!diffResponse.ok) {
        throw new Error(
          `GitHub API responded with status: ${diffResponse.status}`
        );
      }
      diffContent = await diffResponse.text();
    }

    return {
      compareData,
      diffContent,
    };
  } catch (error) {
    console.error('Error fetching details:', error);
    throw error;
  }
};
