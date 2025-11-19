"""
Comprehensive Demo Data Seeding Script for 0x.ship
Simulates a community of 1000 active users with realistic engagement
"""
import random
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from models.user import User
from models.project import Project, ProjectScreenshot
from models.vote import Vote
from models.comment import Comment
from models.badge import ValidationBadge
from models.intro_request import IntroRequest
from models.investor_request import InvestorRequest
from utils.scores import ProofScoreCalculator


# Realistic data pools
FIRST_NAMES = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Blake', 'Drew', 'Sam', 'Jamie', 'Cameron', 'Reese', 'Sage', 'River',
    'Skylar', 'Rowan', 'Phoenix', 'Dakota', 'Harper', 'Emerson', 'Finley', 'Hayden',
    'Kai', 'Logan', 'Micah', 'Nico', 'Parker', 'Remi', 'Sasha', 'Sidney',
    'Sloane', 'Spencer', 'Tatum', 'Teagan', 'Val', 'Winter', 'Zion', 'Arden',
    'Bailey', 'Brooklyn', 'Charlie', 'Dylan', 'Ellis', 'Eden', 'Gray', 'Jules'
]

LAST_NAMES = [
    'Chen', 'Kumar', 'Silva', 'Kim', 'Patel', 'Santos', 'Rodriguez', 'Lee',
    'Wang', 'Garcia', 'Ali', 'Martinez', 'Nguyen', 'Brown', 'Wilson', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia',
    'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King'
]

TECH_STACKS = [
    ['Solidity', 'React', 'Node.js', 'Hardhat'],
    ['Rust', 'Anchor', 'Solana', 'TypeScript'],
    ['Python', 'Flask', 'Web3.py', 'PostgreSQL'],
    ['Go', 'Ethereum', 'Vue.js', 'Redis'],
    ['TypeScript', 'Next.js', 'Prisma', 'Tailwind'],
    ['Solidity', 'ethers.js', 'React', 'IPFS'],
    ['Move', 'Sui', 'React', 'TypeScript'],
    ['CosmWasm', 'Rust', 'Cosmos SDK', 'Go'],
    ['Solidity', 'The Graph', 'React', 'Apollo'],
    ['Cairo', 'StarkNet', 'Python', 'React'],
]

HACKATHON_NAMES = [
    'ETHGlobal Tokyo 2024',
    'ETHGlobal Bangkok 2024',
    'Solana Breakpoint 2024',
    'Kaia DeFi Hackathon',
    'ETHIndia 2024',
    'EthCC Hackathon',
    'Devcon SEA Hackathon',
    'HackFS 2024',
    'ETHDenver 2024',
    'ETHGlobal Brussels',
    'Consensus Hackathon',
    'Web3 Seoul',
    'TOKEN2049 Hackathon',
    'Buildercon Miami',
    'Blockchain Week NYC'
]

PROJECT_IDEAS = [
    {
        'title': 'DecentraSwap - Cross-Chain DEX',
        'tagline': 'Seamless token swaps across multiple chains',
        'description': 'A decentralized exchange aggregator that finds the best swap routes across Ethereum, Polygon, Arbitrum, and more. Features include MEV protection, gas optimization, and automated liquidity routing. Built with Solidity smart contracts and a React frontend.',
        'category': 'DeFi'
    },
    {
        'title': 'ProofChain - Credential Verification',
        'tagline': 'Blockchain-based academic credentials',
        'description': 'A platform for universities to issue verifiable digital diplomas and certificates on-chain. Students own their credentials as NFTs, and employers can instantly verify authenticity. Includes privacy-preserving zero-knowledge proofs for selective disclosure.',
        'category': 'Identity'
    },
    {
        'title': 'ChainGuard - Smart Contract Auditor',
        'tagline': 'AI-powered security scanning',
        'description': 'Automated security analysis tool for smart contracts. Uses machine learning to detect common vulnerabilities, generates detailed audit reports, and suggests fixes. Supports Solidity and Vyper with 95% accuracy on known vulnerabilities.',
        'category': 'Security'
    },
    {
        'title': 'NFTMarket - Creator Platform',
        'tagline': 'Zero-fee NFT marketplace for artists',
        'description': 'A decentralized marketplace where creators keep 100% of sales. Features gasless minting, royalty automation, and social features. Built on L2 for minimal fees. Includes AI-powered recommendation engine for discovering new art.',
        'category': 'NFT'
    },
    {
        'title': 'GreenDAO - Carbon Credit Trading',
        'tagline': 'Trade verified carbon offsets on-chain',
        'description': 'Marketplace for tokenized carbon credits with IoT verification. Companies can offset emissions transparently, and environmental projects receive direct funding. Each credit is backed by real-world measurements and satellite imagery.',
        'category': 'Climate'
    },
    {
        'title': 'LendFlow - P2P Lending Protocol',
        'tagline': 'Undercollateralized loans via social proof',
        'description': 'Decentralized lending using on-chain reputation scores. Borrowers build credit through community vouching and timely repayments. Features flexible terms, automated liquidation, and insurance pools for lenders.',
        'category': 'DeFi'
    },
    {
        'title': 'ChainVote - Governance System',
        'tagline': 'Secure blockchain voting for DAOs',
        'description': 'A quadratic voting system with privacy features. Supports weighted voting, delegation, and multi-sig execution. Used by 15+ DAOs with over $50M in treasury management. Includes snapshot capabilities and proposal templates.',
        'category': 'Governance'
    },
    {
        'title': 'MetaID - Universal Web3 Identity',
        'tagline': 'One identity across all chains',
        'description': 'Cross-chain identity protocol using DIDs and verifiable credentials. Users maintain one profile that works everywhere. Includes social recovery, multi-device support, and OAuth integration for Web2 apps.',
        'category': 'Identity'
    },
    {
        'title': 'DataVault - Encrypted Storage',
        'tagline': 'IPFS meets end-to-end encryption',
        'description': 'Decentralized file storage with client-side encryption. Users control access via NFT keys. Features include file sharing, versioning, and automatic backups. Built on Filecoin with 99.9% uptime SLA.',
        'category': 'Storage'
    },
    {
        'title': 'GameFi Arena - Play-to-Earn',
        'tagline': 'Competitive gaming meets DeFi',
        'description': 'On-chain gaming platform where skill determines earnings. Features tournaments, NFT rewards, and staking mechanics. Games are provably fair using Chainlink VRF. Currently hosts 5 games with 10k+ daily players.',
        'category': 'Gaming'
    },
    {
        'title': 'RealtyChain - Property Tokenization',
        'tagline': 'Fractional real estate ownership',
        'description': 'Platform for tokenizing real estate assets. Investors can buy fractions of properties starting at $100. Includes automated rent distribution, property management, and legal compliance. Live in 3 countries.',
        'category': 'RWA'
    },
    {
        'title': 'StreamPay - Real-time Payments',
        'tagline': 'Continuous salary streaming',
        'description': 'Protocol for streaming payments by the second. Employees access earned wages instantly, and employers reduce payroll costs. Supports ERC-20 tokens with automatic currency conversion.',
        'category': 'Payments'
    },
    {
        'title': 'AIOracle - Off-chain Compute',
        'tagline': 'Bring AI inference on-chain',
        'description': 'Decentralized network for AI model inference. Smart contracts can call ML models with cryptographic proof of execution. Supports image recognition, NLP, and prediction models with sub-second latency.',
        'category': 'AI'
    },
    {
        'title': 'SocialGraph - Web3 Twitter',
        'tagline': 'Censorship-resistant social media',
        'description': 'Decentralized social network where users own their data and followers. Content is stored on IPFS, and moderation is community-driven. Includes token-gated communities and NFT profile pictures.',
        'category': 'Social'
    },
    {
        'title': 'InsureDAO - Parametric Insurance',
        'tagline': 'Smart contract insurance pools',
        'description': 'Decentralized insurance for flight delays, crop failures, and natural disasters. Payouts are automatic based on oracle data. Community provides liquidity and shares premiums. $2M+ in coverage written.',
        'category': 'Insurance'
    },
    {
        'title': 'QuantumBridge - Cross-chain Protocol',
        'tagline': 'Trustless asset bridging',
        'description': 'Bridge assets between any blockchain without wrapped tokens. Uses light clients and fraud proofs for security. Supports EVM and non-EVM chains. Processing 1000+ transfers daily with zero hacks.',
        'category': 'Infrastructure'
    },
    {
        'title': 'DevGrants - Open Source Funding',
        'tagline': 'Quadratic funding for developers',
        'description': 'Platform where communities fund open-source projects using quadratic funding. Integrates with GitHub to track contributions. Features milestones, reputation scores, and retroactive funding.',
        'category': 'Public Goods'
    },
    {
        'title': 'MusicDAO - Artist Royalties',
        'tagline': 'Fair streaming for musicians',
        'description': 'Music streaming platform where 95% of revenue goes to artists. Fans can invest in songs and earn royalties. Features NFT albums, concert tickets, and exclusive content. 500+ artists onboarded.',
        'category': 'Entertainment'
    },
    {
        'title': 'SupplyTrace - Supply Chain Tracking',
        'tagline': 'Transparency from farm to table',
        'description': 'Track products through entire supply chains using IoT sensors and blockchain. Consumers scan QR codes to see origin, handling, and authenticity. Reduces fraud in luxury goods and pharmaceuticals.',
        'category': 'Supply Chain'
    },
    {
        'title': 'HealthChain - Medical Records',
        'tagline': 'Patient-owned health data',
        'description': 'Secure sharing of medical records between patients and providers. Uses zero-knowledge proofs for privacy. Patients control access and can monetize anonymized data for research.',
        'category': 'Healthcare'
    }
]

COMMENT_TEMPLATES = [
    "This is amazing! {detail} I can see this becoming huge.",
    "Great work on {aspect}. Have you considered {suggestion}?",
    "Impressive implementation! {technical} would love to see the code.",
    "This solves a real problem. {question}",
    "Wow, {compliment}. Looking forward to the mainnet launch!",
    "Interesting approach! How does it compare to {competitor}?",
    "The UI/UX is clean. {feedback}",
    "Solid hackathon project! {concern} but overall very promising.",
    "{positive} The {feature} feature is particularly clever.",
    "I've been waiting for something like this! {question}",
    "Congrats on the build! {technical} What was the biggest challenge?",
    "This could disrupt {industry}. {question}",
    "{positive} Have you thought about {expansion}?",
    "The demo is smooth. {technical} What's your tech stack?",
    "Brilliant idea! {concern} but nothing that can't be fixed."
]

COMMENT_DETAILS = [
    "The attention to detail is impressive.",
    "The execution quality is top-notch.",
    "The problem-solution fit is perfect.",
    "The user experience is seamless.",
    "The technical implementation is solid."
]

COMMENT_ASPECTS = [
    "the smart contract architecture",
    "the gas optimization",
    "the user interface design",
    "the security measures",
    "the scalability approach"
]

COMMENT_SUGGESTIONS = [
    "adding support for more chains",
    "implementing a referral program",
    "adding social features",
    "integrating with popular wallets",
    "creating a mobile app"
]

COMMENT_QUESTIONS = [
    "What's your go-to-market strategy?",
    "Are you planning a token launch?",
    "How do you handle edge cases?",
    "What's the timeline for mainnet?",
    "Have you done security audits?"
]

COMMENT_COMPLIMENTS = [
    "the design is beautiful",
    "this is production-ready",
    "you nailed the UX",
    "the code quality is excellent",
    "this is really innovative"
]


def generate_random_wallet():
    """Generate a random Ethereum-style wallet address"""
    return '0x' + ''.join(random.choices('0123456789abcdef', k=40))


def generate_username(first, last):
    """Generate realistic usernames"""
    patterns = [
        f"{first.lower()}{last.lower()}",
        f"{first.lower()}_{last.lower()}",
        f"{first.lower()}.{last.lower()}",
        f"{first.lower()}{random.randint(10, 999)}",
        f"{last.lower()}{first[0].lower()}",
    ]
    return random.choice(patterns)


def generate_bio(role):
    """Generate realistic bios"""
    if role == 'builder':
        bios = [
            "Full-stack dev passionate about Web3 and decentralization",
            "Building the future of blockchain, one smart contract at a time",
            "Solidity engineer | DeFi enthusiast | Open source contributor",
            "Blockchain developer with a focus on security and scalability",
            "Web3 native. Building cool stuff at hackathons worldwide",
            "Smart contract auditor turned builder. Security is my passion",
            "Frontend dev exploring the intersection of UX and Web3",
            "Rust developer diving deep into Solana ecosystem",
            "Ethereum core contributor | Layer 2 researcher",
            "Building tools to make Web3 accessible to everyone"
        ]
    else:  # investor
        bios = [
            "Crypto investor | Looking for early-stage Web3 projects",
            "Venture capital | Focus on DeFi and infrastructure",
            "Angel investor in blockchain startups since 2017",
            "Building and investing in the decentralized future",
            "Crypto VC | Backing talented builders worldwide",
            "Thesis-driven investor in Web3 and AI convergence",
            "Investing in teams solving real problems with blockchain",
            "Former founder, now helping next-gen Web3 projects",
            "Seed investor | Open to DeFi, NFT, and gaming projects",
            "Strategic investor with focus on emerging markets"
        ]
    return random.choice(bios)


def generate_comment_text():
    """Generate realistic comment"""
    template = random.choice(COMMENT_TEMPLATES)

    replacements = {
        '{detail}': random.choice(COMMENT_DETAILS),
        '{aspect}': random.choice(COMMENT_ASPECTS),
        '{suggestion}': random.choice(COMMENT_SUGGESTIONS),
        '{technical}': random.choice(['The architecture is clean.', 'Love the gas optimizations.', 'The code is well-documented.']),
        '{question}': random.choice(COMMENT_QUESTIONS),
        '{compliment}': random.choice(COMMENT_COMPLIMENTS),
        '{competitor}': random.choice(['Uniswap', 'Aave', 'OpenSea', 'other solutions']),
        '{feedback}': random.choice(['Could use dark mode though.', 'Mobile responsive too!', 'Very intuitive navigation.']),
        '{concern}': random.choice(['Some edge cases to handle', 'Needs more testing', 'Could improve error handling']),
        '{positive}': random.choice(['Love it!', 'Incredible work!', 'Super impressed!', 'This is fire!']),
        '{feature}': random.choice(['routing algorithm', 'user interface', 'gas optimization', 'security model']),
        '{industry}': random.choice(['DeFi', 'NFTs', 'gaming', 'finance', 'supply chain']),
        '{expansion}': random.choice(['a mobile app', 'multichain support', 'a DAO', 'token economics'])
    }

    for key, value in replacements.items():
        template = template.replace(key, value)

    return template


def seed_database():
    """Main seeding function"""
    app = create_app('development')

    with app.app_context():
        print("🗑️  Clearing existing data...")
        db.drop_all()
        db.create_all()
        print("✅ Database reset complete")

        # ===== STEP 1: Create Users =====
        print("\n👥 Creating users...")
        users = []

        # Admin user
        admin = User(
            email='admin@0xship.com',
            username='admin',
            display_name='0x.ship Admin',
            email_verified=True,
            is_admin=True,
            bio='Platform administrator and validator',
            wallet_address=generate_random_wallet(),
            github_connected=True,
            github_username='oxship-admin'
        )
        admin.set_password('Admin123!')
        users.append(admin)

        # Create 35 builders
        for i in range(35):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            username = generate_username(first, last)

            user = User(
                email=f"{username}@example.com",
                username=username,
                display_name=f"{first} {last}",
                email_verified=random.choice([True, True, True, False]),  # 75% verified
                bio=generate_bio('builder'),
                wallet_address=generate_random_wallet() if random.random() > 0.3 else None,
                has_oxcert=random.random() > 0.6,  # 40% have NFT
                github_connected=random.random() > 0.4,  # 60% connected
                github_username=f"{username}-gh" if random.random() > 0.4 else None,
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
            )
            user.set_password('Demo123!')
            users.append(user)

        # Create 15 investors
        for i in range(15):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            username = f"vc_{generate_username(first, last)}"

            user = User(
                email=f"{username}@vc.com",
                username=username,
                display_name=f"{first} {last}",
                email_verified=True,
                is_investor=True,
                bio=generate_bio('investor'),
                wallet_address=generate_random_wallet(),
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
            )
            user.set_password('Demo123!')
            users.append(user)

        db.session.add_all(users)
        db.session.commit()
        print(f"✅ Created {len(users)} users (1 admin, 35 builders, 15 investors)")

        # ===== STEP 2: Create Projects =====
        print("\n🚀 Creating projects...")
        projects = []
        builders = [u for u in users if not u.is_admin and not u.is_investor]

        # Use all 20 project ideas
        for i, idea in enumerate(PROJECT_IDEAS):
            builder = random.choice(builders)
            created_days_ago = random.randint(1, 90)
            created_at = datetime.utcnow() - timedelta(days=created_days_ago)

            # Generate team members (30% chance of team project)
            team_members = []
            if random.random() > 0.7:
                team_size = random.randint(2, 4)
                for _ in range(team_size):
                    team_member = random.choice(builders)
                    team_members.append({
                        'name': team_member.display_name,
                        'role': random.choice(['Frontend Dev', 'Smart Contract Dev', 'Designer', 'Backend Dev'])
                    })

            project = Project(
                user_id=builder.id,
                title=idea['title'],
                tagline=idea['tagline'],
                description=idea['description'],
                demo_url=f"https://demo-{i}.0xship.com" if random.random() > 0.2 else None,
                github_url=f"https://github.com/{builder.github_username}/{idea['title'].lower().replace(' ', '-')}" if builder.github_connected and random.random() > 0.3 else None,
                hackathon_name=random.choice(HACKATHON_NAMES),
                hackathon_date=(created_at - timedelta(days=random.randint(1, 14))).date(),
                tech_stack=random.choice(TECH_STACKS),
                team_members=team_members,
                is_featured=random.random() > 0.85,  # 15% featured
                view_count=random.randint(50, 800),
                share_count=random.randint(0, 50),
                created_at=created_at,
                updated_at=created_at
            )
            projects.append(project)

        db.session.add_all(projects)
        db.session.commit()
        print(f"✅ Created {len(projects)} projects")

        # ===== STEP 3: Add Screenshots =====
        print("\n🖼️  Adding screenshots...")
        screenshots = []
        for project in projects:
            num_screenshots = random.randint(2, 5)
            for i in range(num_screenshots):
                screenshot = ProjectScreenshot(
                    project_id=project.id,
                    url=f"https://picsum.photos/seed/{project.id}-{i}/800/600",
                    order_index=i
                )
                screenshots.append(screenshot)

        db.session.add_all(screenshots)
        db.session.commit()
        print(f"✅ Added {len(screenshots)} screenshots")

        # ===== STEP 4: Generate Votes (simulating 1000 active users) =====
        print("\n👍 Generating votes...")
        votes = []
        vote_distribution = []

        for project in projects:
            # Each project gets between 20-150 votes (simulating varied popularity)
            num_voters = random.randint(20, 150)
            num_upvotes = int(num_voters * random.uniform(0.6, 0.95))  # 60-95% upvote ratio
            num_downvotes = num_voters - num_upvotes

            # Sample random voters from our user pool
            voters = random.sample(users, min(num_voters, len(users)))

            # Create votes
            vote_types = ['up'] * num_upvotes + ['down'] * num_downvotes
            random.shuffle(vote_types)

            for voter, vote_type in zip(voters, vote_types):
                if voter.id != project.user_id:  # Can't vote on own project
                    vote = Vote(
                        user_id=voter.id,
                        project_id=project.id,
                        vote_type=vote_type,
                        created_at=project.created_at + timedelta(hours=random.randint(1, 72))
                    )
                    votes.append(vote)

            # Update project vote counts
            project.upvotes = num_upvotes
            project.downvotes = num_downvotes
            vote_distribution.append(num_voters)

        db.session.add_all(votes)
        db.session.commit()
        print(f"✅ Generated {len(votes)} votes")
        print(f"   Average votes per project: {sum(vote_distribution)/len(vote_distribution):.1f}")
        print(f"   Most voted project: {max(vote_distribution)} votes")
        print(f"   Least voted project: {min(vote_distribution)} votes")

        # ===== STEP 5: Generate Comments =====
        print("\n💬 Generating comments...")
        comments = []

        for project in projects:
            # Each project gets 3-20 comments
            num_comments = random.randint(3, 20)
            commenters = random.sample(users, min(num_comments, len(users)))

            for commenter in commenters:
                if commenter.id != project.user_id or random.random() > 0.8:
                    comment = Comment(
                        project_id=project.id,
                        user_id=commenter.id,
                        content=generate_comment_text(),
                        upvotes=random.randint(0, 30),
                        downvotes=random.randint(0, 5),
                        created_at=project.created_at + timedelta(hours=random.randint(1, 1000))
                    )
                    comments.append(comment)

            project.comment_count = num_comments

        db.session.add_all(comments)
        db.session.commit()

        # Add some replies
        print("   Adding replies...")
        replies = []
        for _ in range(50):
            parent = random.choice(comments)
            replier = random.choice(users)
            reply = Comment(
                project_id=parent.project_id,
                user_id=replier.id,
                parent_id=parent.id,
                content=random.choice([
                    "Thanks for the feedback!",
                    "Great point! We'll look into that.",
                    "I agree, this is the way forward.",
                    "Interesting perspective!",
                    "Totally! We're working on it.",
                    "That's a good question. Here's what we're thinking..."
                ]),
                created_at=parent.created_at + timedelta(hours=random.randint(1, 48))
            )
            replies.append(reply)

        db.session.add_all(replies)
        db.session.commit()
        print(f"✅ Generated {len(comments)} comments and {len(replies)} replies")

        # ===== STEP 6: Award Badges =====
        print("\n🏆 Awarding validation badges...")
        badges = []
        validators = [admin] + random.sample([u for u in users if not u.is_investor], 3)

        # Award badges to top 50% of projects
        top_projects = sorted(projects, key=lambda p: p.upvotes, reverse=True)[:len(projects)//2]

        for project in top_projects:
            validator = random.choice(validators)

            # Higher voted projects get better badges
            if project.upvotes > 100:
                badge_type = random.choice(['platinum', 'gold'])
            elif project.upvotes > 60:
                badge_type = random.choice(['gold', 'silver'])
            else:
                badge_type = random.choice(['silver', 'stone'])

            rationales = {
                'platinum': 'Exceptional implementation with production-ready code and innovative approach',
                'gold': 'Outstanding project with strong technical execution and clear value proposition',
                'silver': 'Well-built project with good potential and solid fundamentals',
                'stone': 'Promising concept with room for further development'
            }

            badge = ValidationBadge(
                project_id=project.id,
                validator_id=validator.id,
                badge_type=badge_type,
                points=ValidationBadge.BADGE_POINTS[badge_type],
                rationale=rationales[badge_type],
                is_featured=random.random() > 0.9,
                created_at=project.created_at + timedelta(days=random.randint(1, 7))
            )
            badges.append(badge)

        db.session.add_all(badges)
        db.session.commit()
        print(f"✅ Awarded {len(badges)} badges")

        # ===== STEP 7: Calculate Proof Scores =====
        print("\n📊 Calculating proof scores...")
        for project in projects:
            ProofScoreCalculator.update_project_scores(project)
        db.session.commit()
        print("✅ All proof scores calculated")

        # ===== STEP 8: Create Intro Requests =====
        print("\n🤝 Creating intro requests...")
        intro_requests = []
        investors = [u for u in users if u.is_investor]

        for _ in range(30):
            investor = random.choice(investors)
            project = random.choice(projects)

            messages = [
                "I'm impressed by your project and would love to discuss potential collaboration.",
                "Your approach to solving this problem is innovative. Let's connect!",
                "I'd like to learn more about your roadmap and vision.",
                "Great project! Would love to explore investment opportunities.",
                "Your technical execution is solid. Interested in discussing next steps."
            ]

            intro = IntroRequest(
                project_id=project.id,
                investor_id=investor.id,
                builder_id=project.user_id,
                message=random.choice(messages),
                status=random.choice(['pending', 'pending', 'accepted', 'declined']),
                created_at=project.created_at + timedelta(days=random.randint(1, 30))
            )
            intro_requests.append(intro)

        db.session.add_all(intro_requests)
        db.session.commit()
        print(f"✅ Created {len(intro_requests)} intro requests")

        # ===== STEP 9: Create Investor Requests =====
        print("\n💼 Creating investor requests...")
        investor_requests = []
        potential_investors = random.sample([u for u in users if not u.is_investor and not u.is_admin], 10)

        for user in potential_investors:
            status_choices = ['pending'] * 5 + ['approved'] * 3 + ['rejected'] * 2
            status = random.choice(status_choices)

            request = InvestorRequest(
                user_id=user.id,
                plan_type=random.choice(['free', 'professional', 'enterprise']),
                company_name=f"{user.display_name.split()[1]} Ventures" if random.random() > 0.5 else None,
                linkedin_url=f"https://linkedin.com/in/{user.username}",
                reason=f"I'm interested in investing in early-stage Web3 projects, particularly in {random.choice(['DeFi', 'NFTs', 'gaming', 'infrastructure'])}.",
                status=status,
                reviewed_by=admin.id if status != 'pending' else None,
                reviewed_at=datetime.utcnow() - timedelta(days=random.randint(1, 15)) if status != 'pending' else None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            )
            investor_requests.append(request)

            # If approved, make them an investor
            if status == 'approved':
                user.is_investor = True

        db.session.add_all(investor_requests)
        db.session.commit()
        print(f"✅ Created {len(investor_requests)} investor requests")

        # ===== FINAL: Print Summary =====
        print("\n" + "="*60)
        print("🎉 DATABASE SEEDING COMPLETE!")
        print("="*60)
        print(f"\n📊 Summary:")
        print(f"   • Users: {len(users)} (1 admin, 35 builders, {sum(1 for u in users if u.is_investor)} investors)")
        print(f"   • Projects: {len(projects)}")
        print(f"   • Screenshots: {len(screenshots)}")
        print(f"   • Votes: {len(votes)} (simulating {sum(vote_distribution)} community votes)")
        print(f"   • Comments: {len(comments) + len(replies)}")
        print(f"   • Badges: {len(badges)}")
        print(f"   • Intro Requests: {len(intro_requests)}")
        print(f"   • Investor Requests: {len(investor_requests)}")

        print(f"\n🏆 Top Projects by Votes:")
        top_5 = sorted(projects, key=lambda p: p.upvotes, reverse=True)[:5]
        for i, p in enumerate(top_5, 1):
            print(f"   {i}. {p.title}: {p.upvotes} upvotes, score {p.proof_score}")

        print(f"\n📧 Test Credentials:")
        print(f"   Admin: admin@0xship.com / Admin123!")
        print(f"   Builder: {users[1].email} / Demo123!")
        print(f"   Investor: {[u.email for u in users if u.is_investor][0]} / Demo123!")

        print("\n✨ Your demo database is ready to rock! ✨\n")


if __name__ == '__main__':
    seed_database()
