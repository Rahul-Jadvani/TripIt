"""
Seed demo data for 0x.ship MVP
"""
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from models.user import User
from models.project import Project, ProjectScreenshot
from models.vote import Vote
from models.badge import ValidationBadge
from models.comment import Comment


def seed_demo_data():
    """Populate database with demo data"""
    app = create_app('development')

    with app.app_context():
        # Clear existing data (optional)
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()

        # Create demo users
        print("Creating demo users...")
        users = []

        # Admin user
        admin = User(
            email='admin@0xship.com',
            username='admin',
            display_name='0x.ship Admin',
            email_verified=True,
            is_admin=True,
            bio='Platform administrator'
        )
        admin.set_password('AdminPassword123')
        users.append(admin)

        # Demo builders
        builder1 = User(
            email='alice@example.com',
            username='alice_builder',
            display_name='Alice',
            email_verified=True,
            bio='Full-stack developer passionate about Web3'
        )
        builder1.set_password('DemoPassword123')
        users.append(builder1)

        builder2 = User(
            email='bob@example.com',
            username='bob_hacker',
            display_name='Bob',
            email_verified=True,
            bio='Smart contract engineer'
        )
        builder2.set_password('DemoPassword123')
        users.append(builder2)

        # Demo investor
        investor = User(
            email='charlie@example.com',
            username='charlie_vc',
            display_name='Charlie',
            email_verified=True,
            bio='Venture investor interested in crypto projects'
        )
        investor.set_password('DemoPassword123')
        users.append(investor)

        db.session.add_all(users)
        db.session.commit()

        # Create demo projects
        print("Creating demo projects...")
        projects = []

        project1 = Project(
            user_id=builder1.id,
            title='DecentraTrade - Decentralized Marketplace',
            tagline='P2P marketplace powered by smart contracts',
            description='A fully decentralized marketplace that lets anyone buy and sell digital assets without intermediaries. Built with Solidity, Web3.js, and React. Features include escrow contracts, dispute resolution, and reputation system.',
            demo_url='https://decentratrade.example.com',
            github_url='https://github.com/alice/decentratrade',
            hackathon_name='ETHGlobal 2024',
            hackathon_date=datetime.now().date() - timedelta(days=30),
            tech_stack=['Solidity', 'Web3.js', 'React', 'Node.js', 'PostgreSQL']
        )
        projects.append(project1)

        project2 = Project(
            user_id=builder2.id,
            title='LiquidityPool - AMM Protocol',
            tagline='Automated Market Maker with dynamic fee structure',
            description='A novel AMM protocol that adjusts fees based on volatility. Implements advanced pricing mechanisms and includes comprehensive testing suite. Gas-optimized for Kaia network.',
            demo_url='https://liquiditypool.example.com',
            github_url='https://github.com/bob/liquiditypool',
            hackathon_name='Kaia Hackathon 2024',
            hackathon_date=datetime.now().date() - timedelta(days=15),
            tech_stack=['Solidity', 'Kaia', 'Python', 'Hardhat', 'Web3.py']
        )
        projects.append(project2)

        project3 = Project(
            user_id=builder1.id,
            title='CertifyMe - Credential Verification',
            tagline='Blockchain-based credential verification platform',
            description='Enables institutions to issue and verify digital credentials on blockchain. Supports multiple credential types and includes privacy-preserving verification.',
            demo_url='https://certifyme.example.com',
            github_url='https://github.com/alice/certifyme',
            hackathon_name='BuilderConf 2024',
            hackathon_date=datetime.now().date() - timedelta(days=5),
            tech_stack=['Solidity', 'React', 'TypeScript', 'Express.js', 'MongoDB']
        )
        projects.append(project3)

        db.session.add_all(projects)
        db.session.commit()

        # Add screenshots
        print("Adding screenshots...")
        screenshots = [
            ProjectScreenshot(project_id=project1.id, url='https://via.placeholder.com/800x600?text=DecentraTrade+Screenshot+1', order_index=0),
            ProjectScreenshot(project_id=project1.id, url='https://via.placeholder.com/800x600?text=DecentraTrade+Screenshot+2', order_index=1),
            ProjectScreenshot(project_id=project2.id, url='https://via.placeholder.com/800x600?text=LiquidityPool+Screenshot+1', order_index=0),
            ProjectScreenshot(project_id=project3.id, url='https://via.placeholder.com/800x600?text=CertifyMe+Screenshot+1', order_index=0),
        ]
        db.session.add_all(screenshots)
        db.session.commit()

        # Add votes
        print("Adding votes...")
        votes = [
            Vote(user_id=builder2.id, project_id=project1.id, vote_type='up'),
            Vote(user_id=investor.id, project_id=project1.id, vote_type='up'),
            Vote(user_id=builder1.id, project_id=project2.id, vote_type='up'),
            Vote(user_id=investor.id, project_id=project2.id, vote_type='up'),
            Vote(user_id=builder2.id, project_id=project3.id, vote_type='up'),
        ]
        db.session.add_all(votes)

        # Update vote counts
        for project in projects:
            project.upvotes = project.votes.filter_by(vote_type='up').count()
            project.downvotes = project.votes.filter_by(vote_type='down').count()

        db.session.commit()

        # Add badges
        print("Adding validation badges...")
        badges = [
            ValidationBadge(
                project_id=project1.id,
                validator_id=admin.id,
                badge_type='gold',
                rationale='Excellent implementation with comprehensive features',
                points=15
            ),
            ValidationBadge(
                project_id=project2.id,
                validator_id=admin.id,
                badge_type='silver',
                rationale='Well-written contract code',
                points=10
            ),
        ]
        db.session.add_all(badges)
        db.session.commit()

        # Add comments
        print("Adding comments...")
        comments = [
            Comment(
                project_id=project1.id,
                user_id=investor.id,
                content='This looks like a promising project! Would love to hear more about your roadmap.'
            ),
            Comment(
                project_id=project1.id,
                user_id=builder2.id,
                content='Great work on the UI/UX! The escrow mechanism is clever.'
            ),
            Comment(
                project_id=project2.id,
                user_id=builder1.id,
                content='The fee adjustment mechanism is innovative. How does it handle edge cases?'
            ),
        ]
        db.session.add_all(comments)

        # Update comment counts
        for project in projects:
            project.comment_count = project.comments.filter_by(is_deleted=False).count()

        db.session.commit()

        # Update proof scores for all projects
        print("Calculating proof scores...")
        from utils.scores import ProofScoreCalculator
        for project in projects:
            ProofScoreCalculator.update_project_scores(project)

        db.session.commit()

        print("✅ Demo data seeded successfully!")
        print(f"   - {len(users)} users created")
        print(f"   - {len(projects)} projects created")
        print(f"   - {len(votes)} votes added")
        print(f"   - {len(badges)} badges awarded")
        print(f"   - {len(comments)} comments added")


if __name__ == '__main__':
    seed_demo_data()
