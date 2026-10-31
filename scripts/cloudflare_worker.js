export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPOSITORY || env.GITHUB_REPO;
    const token = env.GITHUB_TOKEN;
    if (!owner || !repo || !token) {
      return new Response("Worker configuration is incomplete.", { status: 500 });
    }

    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "dfcs-update-proxy",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (url.pathname === "/android/latest.json") {
      return handleAndroidUpdate(url, owner, repo, ghHeaders);
    }
    if (url.pathname === "/download" && url.searchParams.has("asset")) {
      return handleNamedDownload(url.searchParams.get("asset"), owner, repo, ghHeaders);
    }
    if (url.pathname === "/manifest") {
      return handleReleaseManifest(owner, repo, ghHeaders);
    }
    if (url.pathname === "/latest.json") {
      return handleLatestManifest(request, owner, repo, ghHeaders, ctx);
    }

    const downloadMatch = url.pathname.match(/^\/download\/(\d+)$/);
    if (downloadMatch) {
      return handleDownload(downloadMatch[1], owner, repo, ghHeaders);
    }
    return new Response("Not Found", { status: 404 });
  },
};

async function handleReleaseManifest(owner, repo, ghHeaders) {
  const release = await getLatestRelease(owner, repo, ghHeaders);
  if (release instanceof Response) return release;

  return jsonResponse(
    {
      version: release.tag_name,
      tag: release.tag_name,
      released: release.published_at,
      downloads: release.assets.filter(isDownloadableAsset).map(toManifestDownload),
    },
    "no-store",
  );
}

async function handleLatestManifest(request, owner, repo, ghHeaders, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const release = await getLatestRelease(owner, repo, ghHeaders);
  if (release instanceof Response) return release;
  const manifestAsset = release.assets.find((candidate) => candidate.name === "latest.json");
  if (!manifestAsset) {
    return new Response("latest.json asset not found in latest release", { status: 404 });
  }

  const manifestResp = await fetch(manifestAsset.url, {
    headers: { ...ghHeaders, Accept: "application/octet-stream" },
  });
  if (!manifestResp.ok) {
    return new Response(`Failed to fetch latest.json: ${manifestResp.status}`, { status: 502 });
  }

  const manifest = await manifestResp.json();
  const assetIdByName = Object.fromEntries(release.assets.map((candidate) => [candidate.name, candidate.id]));
  const proxyBase = new URL(request.url).origin;
  for (const platform of Object.values(manifest.platforms || {})) {
    if (!platform.url) continue;
    const filename = decodeURIComponent(new URL(platform.url).pathname.split("/").pop());
    const assetId = assetIdByName[filename];
    if (assetId) platform.url = `${proxyBase}/download/${assetId}`;
  }

  const response = jsonResponse(
    {
      version: manifest.version,
      notes: manifest.notes,
      pub_date: manifest.pub_date,
      platforms: manifest.platforms,
    },
    "public, max-age=300",
  );
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleAndroidUpdate(url, owner, repo, ghHeaders) {
  const currentVersion = url.searchParams.get("current_version");
  if (!currentVersion) return new Response("Missing current_version", { status: 400 });

  const release = await getLatestRelease(owner, repo, ghHeaders);
  if (release instanceof Response) return release;
  const latestVersion = release.tag_name.replace(/^v/, "");
  if (!isNewerVersion(currentVersion, latestVersion)) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const apkAsset = release.assets.find((candidate) => /_arm64\.apk$/i.test(candidate.name));
  if (!apkAsset) return new Response("No Android ARM64 APK found in the latest release", { status: 404 });
  return jsonResponse(
    {
      version: latestVersion,
      notes: release.body || "A new DFCS version is available.",
      pub_date: release.published_at,
      url: `${new URL(url).origin}/download/${apkAsset.id}`,
      filename: apkAsset.name,
    },
    "no-store",
  );
}

async function handleNamedDownload(assetKey, owner, repo, ghHeaders) {
  const release = await getLatestRelease(owner, repo, ghHeaders);
  if (release instanceof Response) return release;

  const asset = release.assets.find(
    (candidate) => candidate.name === assetKey && isDownloadableAsset(candidate),
  );
  if (!asset) return new Response(`No release asset found for ${assetKey}.`, { status: 404 });
  return handleDownload(asset.id, owner, repo, ghHeaders);
}

function isDownloadableAsset(asset) {
  const name = asset.name.toLowerCase();
  return (
    !name.endsWith(".sig") &&
    name !== "latest.json" &&
    !name.startsWith("source code") &&
    !name.endsWith(".zip") &&
    !name.endsWith(".tar") &&
    !name.endsWith(".tar.gz")
  );
}

function toManifestDownload(asset) {
  const name = asset.name;
  const lowerName = name.toLowerCase();
  const os = lowerName.includes("windows") || /\.exe$|\.msi$/i.test(name)
    ? "windows"
    : lowerName.includes("mac") || /\.dmg$/i.test(name)
      ? "macos"
      : lowerName.includes("android") || /\.apk$/i.test(name)
        ? "android"
        : "linux";
  const architecture = /arm64|aarch64/i.test(name)
    ? "arm64"
    : /x86(?:_64)?|amd64|x64/i.test(name)
      ? "x64"
      : "x86";
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  return {
    id: name,
    os,
    name,
    architecture,
    ext,
    compat: `${os[0].toUpperCase()}${os.slice(1)} · ${architecture}`,
    asset: name,
    sha: asset.digest?.replace(/^sha256:/i, "") || "available in release metadata",
  };
}

async function getLatestRelease(owner, repo, ghHeaders) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: ghHeaders,
  });
  if (!response.ok) return new Response(`GitHub API error: ${response.status}`, { status: 502 });
  return response.json();
}

async function handleDownload(assetId, owner, repo, ghHeaders) {
  const assetResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`,
    { headers: { ...ghHeaders, Accept: "application/octet-stream" } },
  );
  if (!assetResp.ok) return new Response(`Failed to fetch asset: ${assetResp.status}`, { status: 502 });

  const headers = new Headers({
    "Content-Type": assetResp.headers.get("Content-Type") || "application/octet-stream",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  for (const header of ["Content-Length", "Content-Disposition"]) {
    const value = assetResp.headers.get(header);
    if (value) headers.set(header, value);
  }
  return new Response(assetResp.body, { headers });
}

function isNewerVersion(current, latest) {
  const parse = (value) => {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
    return match ? match.slice(1).map(Number) : null;
  };
  const currentParts = parse(current);
  const latestParts = parse(latest);
  if (!currentParts || !latestParts) return false;
  for (let index = 0; index < 3; index += 1) {
    if (latestParts[index] > currentParts[index]) return true;
    if (latestParts[index] < currentParts[index]) return false;
  }
  return false;
}

function jsonResponse(body, cacheControl) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  });
}
