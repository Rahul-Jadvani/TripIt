"""
GitHub Repository and Team Analysis
Uses GitHub API to analyze code quality and team experience
"""
import os
from github import Github, GithubException
from datetime import datetime, timedelta
import re
import requests


class GitHubAnalyzer:
    """Analyzes GitHub repositories and team members"""

    def __init__(self, access_token=None, graphql_token=None):
        """
        Initialize GitHub analyzer

        Args:
            access_token: GitHub personal access token
        """
        self.github = Github(access_token) if access_token else Github()
        self.graphql_token = graphql_token or access_token or os.getenv('GITHUB_ACCESS_TOKEN')

    def analyze(self, repo_url, team_members=None):
        """
        Analyze GitHub repo and team

        Args:
            repo_url: GitHub repository URL
            team_members: List of team member dicts with github_username

        Returns:
            Dict with repo_quality_score, team_quality_score, and details
        """
        try:
            # Extract owner/repo from URL
            owner_repo = self._extract_owner_repo(repo_url)
            if not owner_repo:
                return self._error_result("Invalid GitHub URL")

            # Analyze repository
            repo_result = self.analyze_repo(owner_repo)

            # Analyze team if provided
            team_result = {'score': 50, 'details': 'No team data'}
            if team_members:
                team_result = self.analyze_team(team_members, owner_repo)

            # Combine scores (50-50 split)
            final_score = (repo_result['score'] * 0.5 + team_result['score'] * 0.5)

            return {
                'score': round(final_score, 2),
                'repo_quality': repo_result,
                'team_quality': team_result
            }

        except Exception as e:
            return self._error_result(str(e))

    def analyze_repo(self, owner_repo):
        """
        Analyze repository quality

        Args:
            owner_repo: "owner/repo" string

        Returns:
            Dict with score and analysis details
        """
        try:
            repo = self.github.get_repo(owner_repo)

            scores = {
                'repo_structure': self._analyze_repo_structure(repo),
                'readme_quality': self._analyze_readme(repo),
                'file_organization': self._analyze_file_organization(repo),
                'code_patterns': self._analyze_code_patterns(repo)
            }

            # Average score with decimal precision
            avg_score = sum(scores.values()) / len(scores)

            return {
                'score': round(avg_score, 2),  # Precise decimal score
                'details': scores,
                'stars': repo.stargazers_count,
                'forks': repo.forks_count,
                'open_issues': repo.open_issues_count,
                'last_updated': repo.updated_at.isoformat() if repo.updated_at else None
            }

        except GithubException as e:
            return self._error_result(f"GitHub API error: {e.status}")

    def analyze_author(self, username):
        """
        Analyze project author's GitHub profile

        Args:
            username: GitHub username of the repository owner

        Returns:
            Dict with author quality score and details
        """
        try:
            # Get user profile
            user = self.github.get_user(username)

            # Analyze the user's GitHub profile
            profile_score, profile_meta = self._analyze_user_profile(user)

            return {
                'score': round(profile_score, 2),
                'author_username': username,
                'public_repos': user.public_repos,
                'followers': user.followers,
                'following': user.following,
                'account_age_days': (datetime.utcnow() - user.created_at.replace(tzinfo=None)).days if user.created_at else 0,
                'contributions_last_year': profile_meta.get('contributions_last_year'),
                'contributions_lifetime': profile_meta.get('contributions_lifetime'),
                'contributions_error': profile_meta.get('contributions_error'),
                'details': f'Analyzed GitHub profile: {username}'
            }

        except Exception as e:
            return {
                'score': 0.0,
                'error': f'Failed to analyze author: {str(e)}',
                'details': f'Could not analyze GitHub profile: {username}'
            }

    def analyze_team(self, team_members, owner_repo):
        """
        Analyze team member GitHub profiles (DEPRECATED - Use analyze_author instead)

        Args:
            team_members: List of dicts with github_username
            owner_repo: "owner/repo" string for contribution analysis

        Returns:
            Dict with team quality score and details
        """
        try:
            team_scores = []

            for member in team_members:
                username = member.get('github_username')
                if not username:
                    continue

                try:
                    user = self.github.get_user(username)
                    score, _ = self._analyze_user_profile(user)
                    team_scores.append(score)
                except:
                    continue

            if not team_scores:
                return {'score': 0, 'details': 'No valid GitHub profiles'}

            avg_score = sum(team_scores) / len(team_scores)

            return {
                'score': round(avg_score, 2),
                'team_size': len(team_scores),
                'details': 'Team analysis complete'
            }

        except Exception as e:
            return {'score': 0, 'details': f'Team analysis error: {str(e)}'}

    def _analyze_repo_structure(self, repo):
        """Analyze repository file structure with decimal precision (0-100)"""
        score = 0.0  # Start from 0 for precise calculation

        try:
            # Check for common project files
            contents = repo.get_contents("")
            file_names = [f.name for f in contents]
            file_names_lower = [f.lower() for f in file_names]

            # Core files (40 points total)
            has_readme = any('readme' in f for f in file_names_lower)
            has_license = any('license' in f for f in file_names_lower)
            has_gitignore = '.gitignore' in file_names
            has_contributing = any('contributing' in f for f in file_names_lower)

            if has_readme:
                score += 15.0
            if has_license:
                score += 12.5
            if has_gitignore:
                score += 10.0
            if has_contributing:
                score += 2.5

            # Configuration files (25 points)
            config_files = ['.editorconfig', 'package.json', 'requirements.txt',
                          'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle',
                          'setup.py', 'pyproject.toml', 'Gemfile', 'composer.json']
            config_count = sum(1 for cf in config_files if cf in file_names)
            score += min(config_count * 5.0, 25.0)

            # CI/CD files (15 points)
            ci_indicators = ['.github', '.gitlab-ci.yml', '.travis.yml',
                           'Jenkinsfile', '.circleci', 'azure-pipelines.yml']
            has_ci = any(ci in file_names for ci in ci_indicators)
            if has_ci:
                score += 15.0

            # Docker/Container files (10 points)
            has_docker = 'Dockerfile' in file_names or 'docker-compose.yml' in file_names
            if has_docker:
                score += 10.0

            # Security files (10 points)
            security_files = ['SECURITY.md', 'CODE_OF_CONDUCT.md', '.github/SECURITY.md']
            security_count = sum(1 for sf in security_files if sf in file_names or
                               any(sf.lower() in fn for fn in file_names_lower))
            score += min(security_count * 5.0, 10.0)

            return round(min(score, 100.0), 2)

        except Exception as e:
            print(f"Error analyzing repo structure: {e}")
            return 30.0  # Lower default for errors

    def _analyze_readme(self, repo):
        """Analyze README quality with detailed metrics (0-100)"""
        try:
            readme = repo.get_readme()
            content = readme.decoded_content.decode('utf-8')

            score = 0.0  # Start from 0 for precise calculation

            # Base score for having README (10 points)
            score += 10.0

            # Length analysis (20 points) - graduated scale
            length = len(content)
            if length >= 3000:
                score += 20.0
            elif length >= 2000:
                score += 17.5
            elif length >= 1500:
                score += 15.0
            elif length >= 1000:
                score += 12.5
            elif length >= 500:
                score += 10.0
            elif length >= 200:
                score += 5.0

            # Essential sections (40 points)
            sections = {
                'installation': r'#+\s*(install|installation|setup|getting\s+started)',
                'usage': r'#+\s*(usage|how\s+to\s+use|quick\s+start)',
                'description': r'#+\s*(about|description|what\s+is|overview)',
                'examples': r'#+\s*(example|demo|screenshots)',
                'documentation': r'#+\s*(documentation|docs|api)',
                'contributing': r'#+\s*(contributing|contribution)',
                'license': r'#+\s*(license)',
                'features': r'#+\s*(features|highlights)'
            }

            section_scores = {
                'installation': 8.0,
                'usage': 8.0,
                'description': 6.0,
                'examples': 6.0,
                'documentation': 4.0,
                'contributing': 3.0,
                'license': 3.0,
                'features': 2.0
            }

            for section, pattern in sections.items():
                if re.search(pattern, content, re.I):
                    score += section_scores[section]

            # Quality indicators (20 points)
            # Images/screenshots
            if re.search(r'!\[.*?\]\(.*?\)', content):
                score += 5.0

            # Code blocks
            code_blocks = len(re.findall(r'```', content)) / 2
            score += min(code_blocks * 2.0, 6.0)

            # Links to external resources
            links_count = len(re.findall(r'\[.*?\]\(http', content))
            score += min(links_count * 0.5, 4.0)

            # Badges (CI, coverage, version, etc.)
            badges = len(re.findall(r'!\[.*?\]\(https?://.*?(shields\.io|badge|travis|circleci)', content))
            score += min(badges * 1.0, 5.0)

            # Table of contents
            if re.search(r'#+\s*(table\s+of\s+contents|contents)', content, re.I):
                score += 10.0

            return round(min(score, 100.0), 2)

        except Exception as e:
            print(f"Error analyzing README: {e}")
            return 0.0  # No README or error

    def _analyze_file_organization(self, repo):
        """Analyze file organization with detailed structure analysis (0-100)"""
        try:
            contents = repo.get_contents("")
            file_names = [f.name for f in contents]
            file_names_lower = [f.lower() for f in file_names]

            score = 0.0  # Start from 0 for precise calculation

            # Source code organization (30 points)
            src_dirs = ['src', 'lib', 'app', 'source', 'core', 'packages', 'modules']
            has_src = any(f in file_names for f in src_dirs)
            if has_src:
                score += 30.0
            else:
                # Penalty for root-level code sprawl
                py_js_files = sum(1 for f in file_names_lower if f.endswith(('.py', '.js', '.ts', '.jsx', '.tsx')))
                if py_js_files <= 3:
                    score += 15.0  # Small project, acceptable
                elif py_js_files <= 6:
                    score += 10.0
                else:
                    score += 5.0  # Too many root files

            # Test organization (25 points)
            test_dirs = ['tests', 'test', '__tests__', 'spec', 'e2e', 'integration']
            has_tests = any(f in file_names for f in test_dirs)
            if has_tests:
                score += 25.0
            else:
                # Check for test files in root
                test_files = sum(1 for f in file_names_lower if 'test' in f or 'spec' in f)
                if test_files > 0:
                    score += 10.0  # Has tests, but not organized

            # Documentation (20 points)
            docs_dirs = ['docs', 'documentation', 'doc', 'wiki']
            has_docs = any(f in file_names for f in docs_dirs)
            if has_docs:
                score += 20.0
            else:
                # Check for doc files in root
                doc_files = sum(1 for f in file_names_lower if f.endswith('.md') and f not in ['readme.md', 'license.md'])
                score += min(doc_files * 3.0, 8.0)

            # Configuration organization (15 points)
            config_dirs = ['config', 'configs', 'configuration', '.config']
            has_config = any(f in file_names for f in config_dirs)
            has_env_example = '.env.example' in file_names or 'env.example' in file_names
            if has_config:
                score += 12.0
            if has_env_example:
                score += 3.0

            # Build/Distribution (10 points)
            build_dirs = ['build', 'dist', 'out', 'target', 'bin', '.next', '.nuxt']
            has_build_config = any(f in file_names for f in ['webpack.config.js', 'vite.config.js',
                                                              'rollup.config.js', 'tsconfig.json',
                                                              'babel.config.js', 'next.config.js'])
            if has_build_config:
                score += 10.0

            return round(min(score, 100.0), 2)

        except Exception as e:
            print(f"Error analyzing file organization: {e}")
            return 40.0

    def _analyze_code_patterns(self, repo):
        """Analyze code patterns, development practices, and quality indicators (0-100)"""
        score = 0.0  # Start from 0 for precise calculation

        try:
            # Commit activity analysis (25 points)
            commits = list(repo.get_commits()[:30])  # Get last 30 commits
            commit_count = len(commits)

            if commit_count >= 25:
                score += 25.0
            elif commit_count >= 15:
                score += 20.0
            elif commit_count >= 10:
                score += 15.0
            elif commit_count >= 5:
                score += 10.0
            elif commit_count >= 1:
                score += 5.0

            # Check commit recency (10 points)
            if commits:
                latest_commit = commits[0]
                commit_date = latest_commit.commit.author.date
                # Handle timezone-aware datetime
                if commit_date.tzinfo is not None:
                    commit_date = commit_date.replace(tzinfo=None)
                days_since_commit = (datetime.utcnow() - commit_date).days
                if days_since_commit <= 7:
                    score += 10.0
                elif days_since_commit <= 30:
                    score += 7.5
                elif days_since_commit <= 90:
                    score += 5.0
                elif days_since_commit <= 180:
                    score += 2.5

            # Continuous Integration (20 points)
            ci_score = 0.0
            try:
                workflows = repo.get_workflows()
                if workflows.totalCount > 0:
                    ci_score += 15.0
                    # Bonus for multiple workflows
                    if workflows.totalCount >= 3:
                        ci_score += 5.0
                    elif workflows.totalCount >= 2:
                        ci_score += 2.5
            except:
                # Fallback: check for CI config files
                try:
                    contents = repo.get_contents("")
                    file_names = [f.name for f in contents]
                    ci_files = ['.travis.yml', '.gitlab-ci.yml', 'Jenkinsfile', 'azure-pipelines.yml']
                    if any(cf in file_names for cf in ci_files):
                        ci_score += 10.0
                except:
                    pass

            score += ci_score

            # Branch management (15 points)
            try:
                branches = list(repo.get_branches())
                branch_count = len(branches)

                if branch_count >= 3:
                    score += 10.0  # Active development with feature branches
                elif branch_count >= 2:
                    score += 7.5
                elif branch_count >= 1:
                    score += 5.0

                # Default branch exists
                if repo.default_branch:
                    score += 5.0
            except:
                pass

            # Pull requests (10 points) - indicates collaborative development
            try:
                prs = repo.get_pulls(state='all')
                pr_count = min(prs.totalCount, 20)  # Cap for calculation
                score += min(pr_count * 0.5, 10.0)
            except:
                pass

            # Repository activity signals (10 points)
            try:
                # Issues usage
                if repo.has_issues and repo.open_issues_count > 0:
                    score += 3.0

                # Wiki usage
                if repo.has_wiki:
                    score += 2.0

                # Projects usage
                if repo.has_projects:
                    score += 2.0

                # Discussions enabled
                if hasattr(repo, 'has_discussions') and repo.has_discussions:
                    score += 3.0
            except:
                pass

            # Repository age and maturity (10 points)
            if repo.created_at:
                created_at = repo.created_at
                # Handle timezone-aware datetime
                if created_at.tzinfo is not None:
                    created_at = created_at.replace(tzinfo=None)
                days_old = (datetime.utcnow() - created_at).days
                if days_old >= 365:
                    score += 10.0  # Mature project (1+ years)
                elif days_old >= 180:
                    score += 7.5  # 6+ months
                elif days_old >= 90:
                    score += 5.0  # 3+ months
                elif days_old >= 30:
                    score += 2.5  # 1+ month

            return round(min(score, 100.0), 2)

        except Exception as e:
            print(f"Error analyzing code patterns: {e}")
            return 40.0

    def _analyze_user_profile(self, user):
        """Analyze individual user GitHub profile with smooth proportional scoring (0-100)"""
        score = 0.0

        try:
            contribution_stats = self._fetch_contribution_stats(user.login, user)
            contributions_last_year = contribution_stats.get('last_year_total')
            contributions_lifetime = contribution_stats.get('lifetime_total')
            contribution_error = contribution_stats.get('error')

            # Default to 0 if stats unavailable
            if contributions_last_year is None:
                contributions_last_year = 0
            if contributions_lifetime is None:
                contributions_lifetime = 0

            # ========== SMOOTH PROPORTIONAL SCORING ==========

            # 1. Public repositories (25 points max)
            # Target: 50+ repos for max points
            # Smooth scoring: proportional to repo count
            repos = user.public_repos
            score += min((repos / 50.0) * 25.0, 25.0)

            # 2. Contributions in last 12 months (25 points max)
            # Target: 1000+ for max points
            # Smooth scoring: proportional to contribution count
            score += min((contributions_last_year / 1000.0) * 25.0, 25.0)

            # 3. Followers (10 points max) - Updated threshold to 300
            # Target: 300+ followers for max points (user requested)
            # Smooth scoring: proportional to follower count
            followers = user.followers
            score += min((followers / 300.0) * 10.0, 10.0)

            # 4. Lifetime contributions (15 points max) - Updated threshold to 5000
            # Target: 5000+ for max points (user requested)
            # Smooth scoring: proportional to lifetime contributions
            score += min((contributions_lifetime / 5000.0) * 15.0, 15.0)

            # 5. Gists (5 points max) - reduced from 10
            # Target: 10+ gists for max points
            # Smooth scoring: proportional to gist count
            gists = user.public_gists
            score += min((gists / 10.0) * 5.0, 5.0)

            # 6. Account age and maturity (10 points max) - reduced from 20
            # Target: 5+ years for max points
            # Smooth scoring: proportional to account age
            # Note: Private repos not accessible via public API
            if user.created_at:
                created_at = user.created_at
                if created_at.tzinfo is not None:
                    created_at = created_at.replace(tzinfo=None)
                days_old = (datetime.utcnow() - created_at).days
                # 5 years = 1825 days
                score += min((days_old / 1825.0) * 10.0, 10.0)

            # 7. Profile completion (10 points max)
            # Check multiple profile fields for completeness
            has_bio = user.bio is not None and len(str(user.bio)) > 10
            has_blog = user.blog is not None and len(str(user.blog)) > 0
            has_company = user.company is not None and len(str(user.company)) > 0
            has_location = user.location is not None and len(str(user.location)) > 0
            has_twitter = hasattr(user, 'twitter_username') and user.twitter_username is not None
            has_email = user.email is not None and len(str(user.email)) > 0

            # Each complete field = 10/6 ≈ 1.67 points
            profile_fields = sum([has_bio, has_blog, has_company, has_location, has_twitter, has_email])
            score += (profile_fields / 6.0) * 10.0

            return round(min(score, 100.0), 2), {
                'contributions_last_year': contributions_last_year,
                'contributions_lifetime': contributions_lifetime,
                'contributions_error': contribution_error
            }

        except Exception as e:
            print(f"Error analyzing user profile: {e}")
            return 0.0, {}

    def _fetch_contribution_stats(self, username, user=None):
        """Fetch contribution stats with GraphQL first, fallback to HTML scraping if needed"""
        now = datetime.utcnow()
        last_year = now - timedelta(days=365)

        # Try GitHub GraphQL first if token available
        graph_error = None
        if self.graphql_token:
            graph_result = self._fetch_contribution_stats_graphql(username, last_year, now, self.graphql_token)
            graph_error = graph_result.get('error')
            if graph_error is None and graph_result.get('last_year_total') is not None:
                return graph_result

        # GraphQL failed - fall back to contribution calendar scraping
        fallback_error = []

        last_year_total = None
        lifetime_total = None

        try:
            last_year_total = self._scrape_contribution_range(username, last_year, now)
        except Exception as e:
            fallback_error.append(f'Last-year scrape failed: {e}')

        try:
            start_year = now.year - 1
            if user and user.created_at:
                created_at = user.created_at.replace(tzinfo=None) if user.created_at.tzinfo else user.created_at
                start_year = created_at.year

            lifetime_total = 0
            for year in range(start_year, now.year + 1):
                range_start = datetime(year, 1, 1)
                range_end = datetime(year + 1, 1, 1)
                lifetime_total += self._scrape_contribution_range(username, range_start, range_end)
        except Exception as e:
            fallback_error.append(f'Lifetime scrape failed: {e}')

        error_messages = []
        if graph_error:
            error_messages.append(f'GraphQL: {graph_error}')
        if fallback_error:
            error_messages.extend(fallback_error)
        if not error_messages and not self.graphql_token:
            error_messages.append('GitHub token unavailable for contribution lookup')

        error_message = None
        if error_messages:
            error_message = '; '.join(error_messages)

        if last_year_total is None and lifetime_total is None and error_message is None:
            error_message = 'GitHub token unavailable for contribution lookup'

        return {
            'last_year_total': last_year_total,
            'lifetime_total': lifetime_total,
            'error': error_message
        }

    def _fetch_contribution_stats_graphql(self, username, start_date, end_date, token):
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }

        def isoformat(dt):
            return dt.replace(microsecond=0).isoformat() + 'Z'

        base_payload = {
            'query': '''
                query($login:String!, $from:DateTime!, $to:DateTime!) {
                  user(login: $login) {
                    contributionsLastYear: contributionsCollection(from: $from, to: $to) {
                      contributionCalendar {
                        totalContributions
                      }
                    }
                    contributionsCollection {
                      contributionYears
                    }
                  }
                }
            ''',
            'variables': {
                'login': username,
                'from': isoformat(start_date),
                'to': isoformat(end_date)
            }
        }

        try:
            response = requests.post('https://api.github.com/graphql', json=base_payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get('errors'):
                message = '; '.join(err.get('message', 'GraphQL error') for err in data['errors'])
                return {'error': message}

            user_data = data.get('data', {}).get('user')
            if not user_data:
                return {'error': 'No user data returned from GitHub GraphQL'}

            last_year_total = user_data.get('contributionsLastYear', {}).get('contributionCalendar', {}).get('totalContributions', 0) or 0
            contribution_years = user_data.get('contributionsCollection', {}).get('contributionYears', []) or []

            lifetime_total = 0
            if contribution_years:
                year_payload = {
                    'query': '''
                        query($login:String!, $from:DateTime!, $to:DateTime!) {
                          user(login: $login) {
                            contributionsCollection(from: $from, to: $to) {
                              contributionCalendar {
                                totalContributions
                              }
                            }
                          }
                        }
                    ''',
                    'variables': {
                        'login': username,
                        'from': None,
                        'to': None
                    }
                }

                for year in sorted(contribution_years):
                    year_payload['variables']['from'] = isoformat(datetime(year, 1, 1))
                    year_payload['variables']['to'] = isoformat(datetime(year + 1, 1, 1))
                    year_resp = requests.post('https://api.github.com/graphql', json=year_payload, headers=headers, timeout=10)
                    year_resp.raise_for_status()
                    year_data = year_resp.json()
                    if year_data.get('errors'):
                        message = '; '.join(err.get('message', 'GraphQL error') for err in year_data['errors'])
                        return {'error': message}
                    total = year_data.get('data', {}).get('user', {}).get('contributionsCollection', {}).get('contributionCalendar', {}).get('totalContributions', 0) or 0
                    lifetime_total += total

            return {
                'last_year_total': last_year_total,
                'lifetime_total': lifetime_total if lifetime_total else last_year_total,
                'error': None
            }
        except Exception as e:
            print(f"Contribution stats fetch failed for {username}: {e}")
            return {'error': str(e)}

    def _scrape_contribution_range(self, username, start_date, end_date):
        """Scrape GitHub contribution calendar for a date range"""
        params = {
            'from': start_date.strftime('%Y-%m-%d'),
            'to': end_date.strftime('%Y-%m-%d')
        }
        headers = {
            'User-Agent': '0xDiscovery-ScoreBot',
            'Accept': 'text/html'
        }
        response = requests.get(
            f'https://github.com/users/{username}/contributions',
            params=params,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        html = response.text
        counts = re.findall(r'data-count="(\d+)"', html)
        return sum(int(count) for count in counts)

    def _extract_owner_repo(self, repo_url):
        """Extract owner/repo from GitHub URL"""
        # Handle different URL formats
        patterns = [
            r'github\.com/([^/]+)/([^/]+)',
            r'github\.com:([^/]+)/([^/]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, repo_url)
            if match:
                owner, repo = match.groups()
                # Remove .git suffix if present
                repo = repo.replace('.git', '')
                return f"{owner}/{repo}"

        return None

    def _error_result(self, error_msg):
        """Return error result structure"""
        return {
            'score': 0,
            'error': error_msg,
            'repo_quality': {'score': 0, 'error': error_msg},
            'team_quality': {'score': 0, 'error': error_msg}
        }
