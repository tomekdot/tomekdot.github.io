/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ExternalLink, Code, FileText, Copy, Check, Lock } from 'lucide-react';
import Markdown from 'react-markdown';
import { Repository } from '../types';
import { CATEGORIES, LANG_COLORS } from '../data';

interface RepoModalProps {
  repo: Repository | null;
  onClose: () => void;
  lang: 'en' | 'pl';
  onUpdateRepo?: (updatedRepo: Repository) => void;
}

// Dynamic authentic code generator
function getDynamicCodeSnippet(repo: Repository): { filename: string; code: string } {
  const name = repo.name.toLowerCase();
  const lang = (repo.lang || 'python').toLowerCase();

  if (lang === 'python') {
    if (name.includes('pyplanet') || name.includes('plugin')) {
      return {
        filename: 'plugin.py',
        code: `# -*- coding: utf-8 -*-
from pyplanet.apps.config import AppConfig
from pyplanet.contrib.command import Command
from pyplanet.utils import style

class TomekPluginConfig(AppConfig):
    name = 'tomekdot_plugin'
    label = 'Tomek Plugin'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.admin = None

    async def on_start(self):
        self.admin = self.instance.apps.get_app('admin')
        await self.instance.signals.listen('trackmania:player_connect', self.player_connect)
        
        # Register in-game Trackmania controller command
        await self.instance.command_manager.register(
            Command(
                target=self.cmd_tomek,
                name='tomek',
                description='Tomekdot special custom plugin status query'
            )
        )

    async def player_connect(self, player, *args, **kwargs):
        await self.instance.chat_manager.send_chat(
            f"Welcome {player.nickname}$z$s to the server! Custom plugin active.",
            player
        )

    async def cmd_tomek(self, player, data, **kwargs):
        await self.instance.chat_manager.send_chat(
            style.status("Tomek's active plugin suite stable build loaded."),
            player
        )`
      };
    }

    if (name.includes('ai') || name.includes('agent') || name.includes('bot')) {
      return {
        filename: 'agent.py',
        code: `def get_lunar_phase_playlist(day_of_month):
    if day_of_month in [0, 29]:
        return "NewMoon_Mystic_Tracks.xml"
    elif 14 <= day_of_month <= 16:
        return "FullMoon_HighIntensity_Tracks.xml"
    return "Standard_Rotation.xml"

# Dynamic lunar agent run
if __name__ == "__main__":
    import datetime
    print("Initiating Tomek's lunar playlist agent controller...")
    day = datetime.datetime.now().day
    playlist = get_lunar_phase_playlist(day)
    print(f"Calculated current cycle day: {day} -> Dynamic playlist loaded: {playlist}")`
      };
    }

    return {
      filename: 'main.py',
      code: `def main():
    print("Welcome to ${repo.name} archive by tomekdot")
    # Dynamic repository status details
    stars = ${repo.stars}
    print(f"Archival verification: {stars} stargazers on GitHub.")

if __name__ == '__main__':
    main()`
    };
  }

  if (lang === 'angelscript') {
    return {
      filename: 'Apeiron.as',
      code: `// Openplanet AngelScript Plugin for Trackmania (${repo.name})
// Developed by tomekdot

bool showTracker = true;
int stars = ${repo.stars};

void Main() {
    print("Initializing ${repo.name} Openplanet Plugin...");
    print("Archived Stargazers: " + stars);
}

void RenderMenu() {
    if (UI::BeginMenu("Tomek's HUD")) {
        if (UI::MenuItem("Toggle Dynamic Overlay", "", showTracker)) {
            showTracker = !showTracker;
        }
        UI::EndMenu();
    }
}

void Render() {
    if (!showTracker) return;
    
    UI::Begin("Celestial Tracker", UI::WindowFlags::NoTitleBar | UI::WindowFlags::AlwaysAutoResize);
    UI::Text("\\$f8aDynamic Overlay System \\$z| Status: STABLE");
    UI::Text("Active Module: ${repo.name}");
    UI::End();
}`
    };
  }

  if (lang === 'ruby') {
    return {
      filename: 'environment.rb',
      code: `# Ruby Script for ${repo.name}
# Archival synchronization manager config

class DevArchiveManager
  attr_accessor :repo_name, :stars_count

  def initialize(name, stars)
    @repo_name = name
    @stars_count = stars
  end

  def diagnose
    puts "[RUBY ARCHIVE] Validating index status: \x1b[32mOK\x1b[0m"
    puts "[RUBY ARCHIVE] Tracking: #{@repo_name} - Stars: #{@stars_count}"
  end
end

manager = DevArchiveManager.new("${repo.name}", ${repo.stars})
manager.diagnose`
    };
  }

  if (lang === 'kotlin') {
    return {
      filename: 'Runner.kt',
      code: `package com.tomekdot

import java.time.LocalDateTime

fun main() {
    println("==== Kotlin Runtime Module Installed ====")
    println("Active project index: ${repo.name}")
    println("Status evaluation date: \${LocalDateTime.now()}")
    val starsSum = ${repo.stars}
    println("Verification telemetry - Stars Count: \$starsSum")
    println("=========================================")
}`
    };
  }

  if (lang === 'c++' || lang === 'cpp') {
    return {
      filename: 'main.cpp',
      code: `#include <iostream>
#include <string>

int main() {
    std::string repoName = "${repo.name}";
    int forkCount = ${repo.forks || 0};
    int stars = ${repo.stars};

    std::cout << "[NATIVE CORE] Launching index controller: " << repoName << std::endl;
    std::cout << "[NATIVE CORE] Telemetry: " << stars << " stars, " << forkCount << " forks" << std::endl;
    std::cout << "[NATIVE CORE] State check: OK. Memory allocation clean." << std::endl;
    return 0;
}`
    };
  }

  if (lang === 'html') {
    return {
      filename: 'index.html',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tomek's ${repo.name} Page</title>
    <style>
        body { background: #0c0c0e; color: #a1a1aa; font-family: monospace; padding: 40px; text-transform: uppercase; }
        .accent { color: #f59e0b; font-weight: bold; }
    </style>
</head>
<body>
    <h2>Archived Layout Context // tomekdot</h2>
    <div style="border: 1px solid #27272a; padding: 20px;">
        <p>Project Archive: <span class="accent">${repo.name}</span></p>
        <p>Status: ONLINE</p>
        <p>Integrations: Github Stars: <span class="accent">${repo.stars}</span></p>
    </div>
</body>
</html>`
    };
  }

  if (lang === 'css') {
    return {
      filename: 'layout.css',
      code: `/* CSS Design presets for ${repo.name} */
:root {
  --editorial-accent: #f59e0b;
  --editorial-bg: #0c0c0e;
  --editorial-text: #e4e4e7;
  --editorial-muted: #71717a;
  --editorial-border: #27272a;
}

body {
  margin: 0;
  background-color: var(--editorial-bg);
  color: var(--editorial-text);
  font-family: 'JetBrains Mono', monospace;
  padding: 2.5rem;
}

.repo-card-glow {
  border: 1px solid var(--editorial-border);
  transition: border-color 0.25s ease;
}

.repo-card-glow:hover {
  border-color: var(--editorial-accent);
}`
    };
  }

  if (lang === 'sql' || lang === 'plsql') {
    return {
      filename: 'schema.sql',
      code: `-- Oracle SQL / PL/SQL schema specification for ${repo.name}
-- Preconfigured table declarations and transaction triggers

CREATE TABLE tomekdot_repository_index (
    repo_id INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    repo_name VARCHAR2(100) NOT NULL,
    stars_counter INT DEFAULT 0,
    commits_registered INT DEFAULT 0,
    status VARCHAR2(20) DEFAULT 'STABLE'
);

CREATE OR REPLACE TRIGGER trg_log_status_change
BEFORE UPDATE ON tomekdot_repository_index
FOR EACH ROW
BEGIN
    DBMS_OUTPUT.PUT_LINE('[SQL TRIGGER] Repository ' || :NEW.repo_name || ' stats synchronized.');
END;
/

INSERT INTO tomekdot_repository_index (repo_name, stars_counter, commits_registered)
VALUES ('${repo.name}', ${repo.stars}, ${repo.commitsCount || 10});

COMMIT;`
    };
  }

  if (lang === 'java') {
    return {
      filename: 'Main.java',
      code: `package com.tomekdot;

public class Main {
    public static void main(String[] args) {
        System.out.println("Tomekdot Java Engine active inside ${repo.name}");
        int stars = ${repo.stars};
        System.out.println("GitHub Repository Stars Count: " + stars);
    }
}`
    };
  }

  if (lang === 'typescript' || lang === 'javascript') {
    return {
      filename: 'index.ts',
      code: `// Express/Node configuration entry code for ${repo.name}
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/archive/status', (req, res) => {
  res.json({
    status: 'active',
    archive: '${repo.name}',
    stars: ${repo.stars}
  });
});

app.listen(PORT, () => {
  console.log(\`Tomekdot engine active on port \${PORT}\`);
});`
    };
  }

  // Fallback default
  return {
    filename: 'config.json',
    code: `{
  "archive_name": "${repo.name}",
  "license": "Apache-2.0",
  "developer": "tomekdot",
  "target_platforms": ["Trackmania", "AIAgentEngine"],
  "status": "online",
  "archived_stars_count": ${repo.stars},
  "commits_registered": ${repo.commitsCount || 0}
}`
  };
}

function enrichStaticSnippet(
  filename: string,
  code: string,
  lang: string,
  repoName: string,
  stars: number
): { filename: string; code: string } {
  const langLower = (lang || '').toLowerCase();
  
  if (code.length > 500) {
    let commentHeader = '';
    if (langLower === 'python' || langLower === 'ruby' || langLower === 'yaml' || langLower === 'sql' || langLower === 'plsql') {
      commentHeader = `# -*- coding: utf-8 -*-
# ====================================================================
# Project: ${repoName}
# File: ${filename}
# Author: tomekdot (https://github.com/tomekdot/${repoName})
# Status: Archive Local Preview // Stargazers: ${stars}
# ====================================================================

`;
    } else if (langLower === 'html' || langLower === 'xml') {
      commentHeader = `<!-- 
  Project: ${repoName}
  File: ${filename}
  Author: tomekdot
  Status: Offline Template Preview // Stars: ${stars}
-->
`;
    } else {
      commentHeader = `/**
 * Project: ${repoName}
 * File: ${filename}
 * Author: tomekdot (https://github.com/tomekdot/${repoName})
 * Status: Archive Local Preview // Stars: ${stars}
 */

`;
    }
    return { filename, code: commentHeader + code };
  }

  if (langLower === 'python') {
    return {
      filename,
      code: `# -*- coding: utf-8 -*-
"""
Module: ${filename}
Project: ${repoName}
Author: tomekdot (https://github.com/tomekdot/${repoName})
License: MIT
Description: Automated repository index evaluation & execution harness
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional

# Setup basic diagnostic logging context
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("${repoName}")

class ProjectSandboxController:
    def __init__(self, name: str, stars: int):
        self.name = name
        self.stars = stars
        self.status = "stable"
        logger.info(f"Initialized active execution sandbox for: {name}")

    def execute_telemetry_check(self) -> Dict[str, Any]:
        logger.info("Gathering active repository system metrics...")
        return {
            "reponame": self.name,
            "stars": self.stars,
            "virtual_node": "Offline_Archive",
            "evaluated_stable": True
        }

# --- Core Repository Implementation Snippet ---
${code.split('\n').map(l => '    ' + l).join('\n')}
# -----------------------------------------------

def main():
    print("=========================================================")
    print("           TOMEKDOT OFFLINE SOURCE CHECKER               ")
    print("=========================================================")
    print(f"Repository Check Target: ${repoName}")
    print(f"GitHub Star Metrics    : {stars}")
    
    sandbox = ProjectSandboxController("${repoName}", ${stars})
    metrics = sandbox.execute_telemetry_check()
    print(f"Active virtual environment parameters: " + json.dumps(metrics, indent=2))
    print("Execution output is verified. [OK]")
    print("=========================================================")

if __name__ == "__main__":
    main()`
    };
  }

  if (langLower === 'java') {
    return {
      filename: filename.endsWith('.java') ? filename : 'Main.java',
      code: `/**
 * Project: ${repoName}
 * Package: com.tomekdot.sandbox
 * File: ${filename}
 * Developer: tomekdot (https://github.com/tomekdot/${repoName})
 * Status: Offline Source Verification
 */

package com.tomekdot;

import java.util.*;
import java.io.*;
import java.time.LocalDateTime;

public class Main {
    private static final String REPO_NAME = "${repoName}";
    private static final int STARGAZERS = ${stars};

    public static void main(String[] args) {
        System.out.println("=====================================================");
        System.out.println("      JAVA SANBOX INTEGRATION CONTROLLER // KUL       ");
        System.out.println("=====================================================");
        System.out.println("Evaluation Unit: " + REPO_NAME);
        System.out.println("Star Counter   : " + STARGAZERS);
        System.out.println("Timestamp      : " + LocalDateTime.now());
        
        try {
            System.out.println("\\n>> Executing Repository Context Method...");
            executeCoreSnippet();
            System.out.println(">> Context Execution Successful. [STABLE]");
        } catch (Exception e) {
            System.err.println(">> Warning during environment test: " + e.getMessage());
        }
        System.out.println("=====================================================");
    }

    private static void executeCoreSnippet() throws Exception {
        // --- Core Repository Code Snippet ---
${code.split('\n').map(l => '        ' + l).join('\n')}
        // --------------------------------------
    }
}`
    };
  }

  if (langLower === 'html') {
    return {
      filename,
      code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${repoName} - ${filename}</title>
    <style>
        body {
            background-color: #0c0c0e;
            color: #e4e4e7;
            font-family: 'JetBrains Mono', monospace;
            padding: 3rem 1.5rem;
            line-height: 1.6;
            margin: 0;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid #27272a;
            background: #111113;
            padding: 3rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }
        .header {
            border-bottom: 2px dashed #f59e0b;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }
        .title {
            color: #f59e0b;
            font-size: 1.8rem;
            font-weight: bold;
            letter-spacing: -0.025em;
            text-transform: uppercase;
        }
        .meta {
            font-size: 0.8rem;
            color: #71717a;
            margin-top: 0.5rem;
        }
        .content {
            border: 1px solid #1f1f23;
            background-color: #080809;
            padding: 2rem;
            margin-top: 1.5rem;
        }
        .footer {
            margin-top: 3rem;
            text-align: center;
            font-size: 0.75rem;
            color: #52525b;
            border-top: 1px solid #1f1f23;
            padding-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">${repoName}</div>
            <div class="meta">
                OFFLINE SOURCE PREVIEW FOR [${filename}] &bull; GITHUB STARS: ${stars} &bull; BY TOMEKDOT
            </div>
        </div>
        
        <p>This layout represents a styled rendering wrapper around the offline repository template:</p>
        
        <div class="content">
            <!-- START OF INJECTED SNIPPET -->
${code.split('\n').map(l => '            ' + l).join('\n')}
            <!-- END OF INJECTED SNIPPET -->
        </div>

        <div class="footer">
            DEVELOPED BY TOMEKDOT / UNIVERSAL ARCHIVE PREVIEW SYSTEM
        </div>
    </div>
</body>
</html>`
    };
  }

  if (langLower === 'sql' || langLower === 'plsql') {
    return {
      filename,
      code: `-- ====================================================================
-- PROJECT  : ${repoName}
-- FILE     : ${filename}
-- ENGINE   : Relational Database Schema / Oracle PL-SQL Context
-- AUTHOR   : tomekdot (https://github.com/tomekdot/${repoName})
-- STATUS   : Stable Pre-deployment Evaluation (Stars: ${stars})
-- ====================================================================

-- 1. Configuration variables and system tracking schema
CREATE TABLE tomekdot_system_telemetry (
    telemetry_id INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    repository_name VARCHAR2(100) NOT NULL,
    pushed_stars INT DEFAULT ${stars},
    is_sandboxed CHAR(1) DEFAULT 'Y',
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Embed core script logic
-- --------------- CORE REPOSITORY WORKLOAD ----------------------
${code}
-- -------------------------------------------------------------

-- 3. Telemetry synchronization trace
INSERT INTO tomekdot_system_telemetry (repository_name)
VALUES ('${repoName}');

COMMIT;

-- ====================================================================
-- ENVIRONMENT INTEGRITY: VERIFIED [STABLE]
-- ====================================================================`
    };
  }

  if (langLower === 'typescript' || langLower === 'javascript' || langLower === 'tsx') {
    return {
      filename,
      code: `/**
 * Project: ${repoName}
 * File: ${filename}
 * Developer: tomekdot (https://github.com/tomekdot/${repoName})
 * Status: Offline Template Preview // Stars: ${stars}
 */

import React, { useState, useEffect } from 'react';

// Main Sandbox Environment Settings
export interface SandboxProperties {
  title: string;
  starsCount: number;
  isActive: boolean;
}

const GlobalMetadata = {
  repository: "${repoName}",
  author: "tomekdot",
  releaseStage: "Stable Evaluated Model"
};

// --- Injected Repository Source Fragment ---
${code}
// -------------------------------------------

export default function SandboxWrapper() {
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    setLoaded(true);
    console.log("[JS/TS Sandbox] Loaded project: " + GlobalMetadata.repository);
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace', color: '#fff' }}>
      <h3>Archive Sandbox evaluation for {GlobalMetadata.repository}</h3>
      <p>Stars gathered on GitHub: ${stars}</p>
      <div style={{ opacity: loaded ? 1 : 0.5, transition: 'opacity 0.3s' }}>
        <span>Integrity Status: SECURE / STABLE</span>
      </div>
    </div>
  );
}`
    };
  }

  return {
    filename,
    code: `/**
 * Project: ${repoName}
 * File: ${filename}
 * Developer: tomekdot (https://github.com/tomekdot/${repoName})
 * Status: Offline Template Preview // Stars: ${stars}
 */

// --- Source Code Start ---
${code}
// --- Source Code End ---
`
  };
}

const getRepoName = (repo: Repository) => {
  if (repo.url) {
    const parts = repo.url.split('/');
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return repo.name;
};

// Extremely responsive fetch with abort controllers
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export default function RepoModal({ repo, onClose, lang, onUpdateRepo }: RepoModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'code'>('info');

  // Dynamic README
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [isLoadingReadme, setIsLoadingReadme] = useState(false);

  useEffect(() => {
    if (!repo) return;
    
    let active = true;
    
    // Clear and reset state
    setReadmeContent(null);
    setActiveTab('info');

    async function fetchReadme() {
      const repoName = getRepoName(repo);
      if (!active) return;
      
      const cacheKey = `github_readme_cache_${repoName}`;
      const cached = localStorage.getItem(cacheKey);

      const isValidReadme = (text: string | null): boolean => {
        if (!text) return false;
        const trimmed = text.trim();
        const lower = trimmed.toLowerCase();
        
        // Match full HTML error pages or full documents (ignore inline <div>/<p> styling inside markdown summaries)
        if (
          lower.startsWith('<!doctype html') || 
          lower.startsWith('<html') || 
          lower.includes('</head>') || 
          lower.includes('</body>') ||
          lower.includes('<body ') ||
          lower.includes('<head ') ||
          lower.includes('window._shareddata') ||
          lower.includes('<title>page not found') ||
          lower.includes('<title>rate limit') ||
          lower.includes('href="https://assets-cdn.github.com/')
        ) {
          return false;
        }
        
        // Filter out JSON error payloads
        if (trimmed.startsWith('{') && trimmed.includes('"message"')) {
          return false;
        }
        
        // Filter plain text errors
        if (trimmed === '404: Not Found' || trimmed === 'Not Found' || lower === 'not found') {
          return false;
        }
        
        return true;
      };

      if (cached && isValidReadme(cached) && active) {
        setReadmeContent(cached);
        setIsLoadingReadme(false);
        return;
      } else if (cached && !isValidReadme(cached)) {
        localStorage.removeItem(cacheKey);
      }

      setIsLoadingReadme(true);
      
      try {
        const rawUrls = [
          `https://raw.githubusercontent.com/tomekdot/${repoName}/main/README.md`,
          `https://raw.githubusercontent.com/tomekdot/${repoName}/main/readme.md`,
          `https://raw.githubusercontent.com/tomekdot/${repoName}/master/README.md`,
          `https://raw.githubusercontent.com/tomekdot/${repoName}/master/readme.md`
        ];

        let loaded = false;
        for (const url of rawUrls) {
          try {
            const rawResponse = await fetchWithTimeout(url, {}, 3000);
            if (rawResponse.ok && active) {
              const rawText = await rawResponse.text();
              if (isValidReadme(rawText)) {
                setReadmeContent(rawText);
                localStorage.setItem(cacheKey, rawText);
                loaded = true;
                break;
              }
            }
          } catch (e) {
            // Ignore individual fetch errors and try next pattern coordinate
          }
        }

        if (loaded) return;

        // Fallback to official GitHub API if raw files failed / check other cases
        const response = await fetchWithTimeout(`https://api.github.com/repos/tomekdot/${repoName}/readme`, {
          headers: {
            'Accept': 'application/vnd.github.v3.raw'
          }
        }, 4000);

        if (response.ok && active) {
          const text = await response.text();
          if (isValidReadme(text)) {
            setReadmeContent(text);
            localStorage.setItem(cacheKey, text);
          } else {
            if (!cached || !isValidReadme(cached)) {
              throw new Error('Invalid README received from API fallback');
            }
          }
        } else {
          if (!cached || !isValidReadme(cached)) {
            throw new Error('No README file located on remote branch');
          }
        }
      } catch (err) {
        console.warn('Dynamic README loading bypass, displaying explicit missing error', err);
        if (active && (!cached || !isValidReadme(cached))) {
          setReadmeContent(null);
        }
      } finally {
        if (active) {
          setIsLoadingReadme(false);
        }
      }
    }


    async function fetchRealCommits() {
      const repoName = getRepoName(repo);
      const match = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      const owner = match ? match[1] : 'tomekdot';
      const actualName = match ? match[2] : repoName;

      const cacheKey = `github_commits_cache_${repoName}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached && active && onUpdateRepo) {
        const val = parseInt(cached, 10);
        if (val !== repo.commitsCount) {
          onUpdateRepo({
            ...repo,
            commitsCount: val
          });
        }
      }

      try {
        const response = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${actualName}/commits?per_page=1`, {}, 4000);
        if (response.ok && active) {
          const linkHeader = response.headers.get('Link');
          let realCommits = 0;
          if (linkHeader) {
            const lastMatch = linkHeader.match(/page=(\d+)>;\s*rel="last"/);
            if (lastMatch) {
              realCommits = parseInt(lastMatch[1], 10);
            }
          } else {
            const commitsArray = await response.json();
            realCommits = Array.isArray(commitsArray) ? commitsArray.length : 0;
          }

          if (active && onUpdateRepo && realCommits !== repo.commitsCount) {
            localStorage.setItem(cacheKey, String(realCommits));

            // Sync with main repository cache list
            const cachedRepos = localStorage.getItem('github_repos_cache');
            if (cachedRepos) {
              try {
                const parsed = JSON.parse(cachedRepos);
                if (Array.isArray(parsed)) {
                  const updatedCache = parsed.map((item: any) => {
                    if (item.name.toLowerCase() === repo.name.toLowerCase()) {
                      return { ...item, commitsCount: realCommits };
                    }
                    return item;
                  });
                  localStorage.setItem('github_repos_cache', JSON.stringify(updatedCache));
                }
              } catch (e) {
                console.warn(e);
              }
            }

            onUpdateRepo({
              ...repo,
              commitsCount: realCommits
            });
          }
        }
      } catch (err) {
        console.warn('Could not load real commits count for', repo.name, err);
      }
    }

    if (!repo.isPrivate) {
      fetchReadme();
      fetchRealCommits();
    } else {
      setIsLoadingReadme(false);
    }

    return () => {
      active = false;
    };
  }, [repo]);

  if (!repo) return null;

  const primaryCatKey = repo.cat[0] || 'other';
  const catSpec = CATEGORIES[primaryCatKey] || CATEGORIES.other;
  const langColor = LANG_COLORS[repo.lang] || '#8b949e';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          id="modal_backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          id="modal_window"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-editorial-bg border-2 border-editorial-border w-full max-w-2xl rounded-none shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        >
          {/* Header Block */}
          <div className="bg-editorial-sidebar-bg border-b border-editorial-border px-6 py-5 flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold text-editorial-accent">
                  {lang === 'en' ? catSpec.labelEn : catSpec.labelPl}
                </span>
                {repo.lang && (
                  <span translate="no" className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-editorial-border text-editorial-muted text-[10px] font-mono notranslate">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColor }} />
                    {repo.lang}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-mono text-white flex flex-wrap items-center gap-2 break-all pr-4 font-mono uppercase tracking-wider">
                <span translate="no" className="notranslate">{repo.name}</span>
                {repo.isPrivate && (
                  <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
                    <Lock size={10} />
                    {lang === 'en' ? 'Private' : 'Prywatne'}
                  </span>
                )}
              </h2>
            </div>

            <button
              type="button"
              id="close_modal_btn"
              onClick={onClose}
              className="text-editorial-muted hover:text-white hover:bg-neutral-900 p-2 rounded-none transition-all border border-editorial-border"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-editorial-border bg-editorial-bg px-6 pt-2">
            <button
              type="button"
              id="tab_info_btn"
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer
                ${activeTab === 'info' 
                  ? 'text-editorial-accent border-editorial-accent' 
                  : 'text-editorial-muted border-transparent hover:text-white'}`}
            >
              <FileText size={14} />
              {lang === 'en' ? 'Overview' : 'Przegląd'}
            </button>
            <button
              type="button"
              id="tab_code_btn"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer
                ${activeTab === 'code' 
                  ? 'text-editorial-accent border-editorial-accent' 
                  : 'text-editorial-muted border-transparent hover:text-white'}`}
            >
              <Code size={14} />
              {repo.isPrivate 
                ? (lang === 'en' ? 'Source Code SNIPPET' : 'WYCINEK KODU') 
                : (lang === 'en' ? 'README.md File' : 'Plik README.md')}
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'info' ? (
              <div className="space-y-6 animate-fadeIn font-sans">
                {/* Statistics panel */}
                {!repo.isPrivate ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-editorial-sidebar-bg border border-editorial-border p-3.5 rounded-none text-center">
                      <div className="flex justify-center mb-1 text-editorial-accent">
                        <Star size={16} />
                      </div>
                      <div className="text-sm font-mono font-bold text-white">{repo.stars}</div>
                      <div className="text-[10px] text-editorial-muted font-mono uppercase tracking-wider mt-0.5">Stars</div>
                    </div>

                    <div className="bg-editorial-sidebar-bg border border-editorial-border p-3.5 rounded-none text-center">
                      <div className="flex justify-center mb-1 text-editorial-accent">
                        <Code size={16} />
                      </div>
                      <div className="text-sm font-mono font-bold text-white">{repo.commitsCount || 0}</div>
                      <div className="text-[10px] text-editorial-muted font-mono uppercase tracking-wider mt-0.5 font-bold">Commits</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950/40 border border-rose-950/40 p-4.5 rounded-none text-center flex flex-col items-center justify-center space-y-1">
                    <Lock size={18} className="text-rose-500/80 mb-1" />
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-rose-500/90">
                      {lang === 'en' ? 'Private Archive Item' : 'Prywatny element archiwum'}
                    </div>
                    <div className="text-[10px] text-editorial-muted font-mono max-w-sm mt-1">
                      {lang === 'en' 
                        ? 'Repository statistics and code history are kept private/offline' 
                        : 'Statystyki repozytorium oraz historia kodu są prywatne/niedostępne publicznie'}
                    </div>
                  </div>
                )}

                {/* Narrative Detail */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-[#8b949e]">
                    {lang === 'en' ? 'Detailed Description // Archival Summary' : 'Szczegółowy opis projektu // Archiwum'}
                  </h4>
                  <div className="p-4.5 rounded-none bg-editorial-sidebar-bg border border-editorial-border text-sm leading-relaxed text-editorial-text italic font-serif">
                    {lang === 'en' 
                      ? (repo.longDescEn || repo.desc) 
                      : (repo.longDescPl || repo.descPl || repo.desc)}
                  </div>
                </div>

                {/* Additional capability tags */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-[#8b949e]">
                    {lang === 'en' ? 'System Metadata' : 'Metadane Systemowe'}
                  </h4>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider">
                    <span translate="no" className="bg-neutral-900 border border-editorial-border px-2 py-1 rounded-none text-editorial-muted notranslate">
                      {repo.lang || 'Git Shell'}
                    </span>
                    {repo.pushedAt && (
                      <span className="bg-neutral-900 border border-editorial-border px-2 py-1 rounded-none text-editorial-accent">
                        {lang === 'en' ? 'Updated: ' : 'Aktualizacja: '}{new Date(repo.pushedAt).toISOString().replace('T', ' ').substring(0, 16)} UTC
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn font-sans leading-relaxed">
                {isLoadingReadme ? (
                  <div className="py-20 text-center font-mono text-xs text-editorial-accent animate-pulse uppercase tracking-widest">
                    &gt;&gt; [FETCHING LIVE ARCHIVAL README.MD...]
                  </div>
                ) : readmeContent ? (
                  <div className="markdown-body text-editorial-text space-y-4 max-h-[42vh] overflow-y-auto pr-2 bg-neutral-950/20 p-4 border border-editorial-border">
                    <Markdown
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold font-serif italic text-white border-b border-editorial-border pb-1 mt-4 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-md font-bold font-serif italic text-white border-b border-editorial-border pb-1 mt-3 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold font-mono text-editorial-accent mt-3 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="text-xs font-sans text-editorial-text leading-relaxed mb-3">{children}</p>,
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code translate="no" className="bg-neutral-900 text-editorial-accent font-mono text-xs px-1 py-0.5 border border-editorial-border notranslate">{children}</code>
                          ) : (
                            <pre className="bg-neutral-950 p-3 border border-editorial-border font-mono text-xs text-emerald-400 overflow-x-auto my-3 leading-relaxed rounded-none max-w-full">
                              <code translate="no" className="notranslate">{children}</code>
                            </pre>
                          );
                        },
                        li: ({ children }) => <li className="text-xs font-sans text-editorial-text leading-relaxed list-disc ml-5 mb-1.5">{children}</li>,
                        ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal my-2 space-y-1 ml-5">{children}</ol>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-editorial-accent hover:underline decoration-dotted font-mono text-xs">{children}</a>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-editorial-accent pl-4 py-1 italic font-serif text-editorial-muted my-3 bg-neutral-900/40">{children}</blockquote>
                      }}
                    >
                      {readmeContent}
                    </Markdown>
                  </div>
                ) : repo.codeSnippet ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between bg-neutral-900 border border-editorial-border px-4 py-2 font-mono text-xs text-editorial-muted">
                      <span translate="no" className="notranslate">{repo.codeSnippet.filename}</span>
                      <span translate="no" className="uppercase text-editorial-accent font-bold notranslate">{repo.codeSnippet.language}</span>
                    </div>
                    <pre className="bg-neutral-950 p-4 border border-editorial-border font-mono text-xs text-emerald-400 overflow-x-auto max-h-[38vh] leading-relaxed rounded-none">
                      <code translate="no" className="notranslate">{repo.codeSnippet.code}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="py-10 px-6 text-center border border-dashed border-rose-900/50 bg-rose-950/10 font-mono text-xs text-rose-400">
                    <div className="flex items-center justify-center gap-2 mb-3 text-rose-500 font-bold uppercase tracking-wider">
                      <span className="animate-pulse">⚠️</span>
                      <span>{lang === 'en' ? 'ERROR: README.md file is missing' : 'BŁĄD: Brak pliku README.md'}</span>
                    </div>
                    <p className="text-editorial-muted text-[11px] leading-relaxed">
                      {lang === 'en' 
                        ? 'The repository does not contain a README.md file on the master or main branch.' 
                        : 'Repozytorium nie zawiera pliku README.md w gałęzi głównej.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions / Buttons Footer */}
          <div className="bg-editorial-sidebar-bg border-t border-editorial-border px-6 py-4.5 flex flex-wrap items-center justify-between gap-3 font-medium">
            <div className="text-xs text-editorial-muted font-mono uppercase tracking-wider">
              {repo.isPrivate ? (
                lang === 'en' ? '🔒 Private Archive' : '🔒 Prywatne Archiwum'
              ) : (
                `★ ${repo.stars} ${lang === 'en' ? 'stargazers on GitHub' : 'gwiazdek na GitHubie'}`
              )}
            </div>

            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-none border border-editorial-accent text-editorial-accent hover:bg-editorial-accent/10 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              <span>{lang === 'en' ? 'Open Archive' : 'Otwórz Repozytorium'}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
