"""
Create chain_posts and chain_post_reactions tables (Reddit-style forum)
Run: python migrations/create_chain_posts.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Creating chain posts forum tables...")

    # Create chain_posts table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chain_posts (
            id VARCHAR(36) PRIMARY KEY,
            chain_id VARCHAR(36) NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
            author_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            parent_id VARCHAR(36) REFERENCES chain_posts(id) ON DELETE CASCADE,
            title VARCHAR(300),
            content TEXT NOT NULL,
            image_urls TEXT[],
            upvote_count INTEGER NOT NULL DEFAULT 0,
            downvote_count INTEGER NOT NULL DEFAULT 0,
            comment_count INTEGER NOT NULL DEFAULT 0,
            total_replies INTEGER NOT NULL DEFAULT 0,
            is_pinned BOOLEAN NOT NULL DEFAULT false,
            is_locked BOOLEAN NOT NULL DEFAULT false,
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            is_hidden BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_activity_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_chain_posts_chain ON chain_posts(chain_id);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_author ON chain_posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_parent ON chain_posts(parent_id);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_deleted ON chain_posts(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_pinned ON chain_posts(chain_id, is_pinned);

        -- Composite indexes for sorting
        CREATE INDEX IF NOT EXISTS idx_chain_posts_chain_created ON chain_posts(chain_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_chain_activity ON chain_posts(chain_id, last_activity_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_chain_upvotes ON chain_posts(chain_id, upvote_count DESC);
        CREATE INDEX IF NOT EXISTS idx_chain_posts_chain_comments ON chain_posts(chain_id, comment_count DESC);

        -- Index for trending algorithm (hot posts)
        CREATE INDEX IF NOT EXISTS idx_chain_posts_trending ON chain_posts(chain_id, upvote_count DESC, created_at DESC)
            WHERE is_deleted = false AND is_hidden = false;
    """))

    print("[OK] Chain posts table created")

    # Create chain_post_reactions table
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS chain_post_reactions (
            id VARCHAR(36) PRIMARY KEY,
            post_id VARCHAR(36) NOT NULL REFERENCES chain_posts(id) ON DELETE CASCADE,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reaction_type VARCHAR(20) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_chain_post_reaction UNIQUE (post_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_chain_post_reactions_post ON chain_post_reactions(post_id);
        CREATE INDEX IF NOT EXISTS idx_chain_post_reactions_user ON chain_post_reactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_chain_post_reactions_type ON chain_post_reactions(reaction_type);
        CREATE INDEX IF NOT EXISTS idx_chain_post_reactions_created ON chain_post_reactions(created_at DESC);
    """))

    print("[OK] Chain post reactions table created")

    # Create trigger functions to update counts
    db.session.execute(text("""
        -- Function to update post upvote/downvote counts
        CREATE OR REPLACE FUNCTION update_chain_post_reaction_counts()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                IF NEW.reaction_type = 'upvote' THEN
                    UPDATE chain_posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
                ELSIF NEW.reaction_type = 'downvote' THEN
                    UPDATE chain_posts SET downvote_count = downvote_count + 1 WHERE id = NEW.post_id;
                END IF;
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.reaction_type = 'upvote' AND NEW.reaction_type = 'downvote' THEN
                    UPDATE chain_posts
                    SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1
                    WHERE id = NEW.post_id;
                ELSIF OLD.reaction_type = 'downvote' AND NEW.reaction_type = 'upvote' THEN
                    UPDATE chain_posts
                    SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1
                    WHERE id = NEW.post_id;
                END IF;
            ELSIF TG_OP = 'DELETE' THEN
                IF OLD.reaction_type = 'upvote' THEN
                    UPDATE chain_posts SET upvote_count = upvote_count - 1 WHERE id = OLD.post_id;
                ELSIF OLD.reaction_type = 'downvote' THEN
                    UPDATE chain_posts SET downvote_count = downvote_count - 1 WHERE id = OLD.post_id;
                END IF;
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_chain_post_reaction_counts ON chain_post_reactions;
        CREATE TRIGGER trigger_update_chain_post_reaction_counts
        AFTER INSERT OR UPDATE OR DELETE ON chain_post_reactions
        FOR EACH ROW EXECUTE FUNCTION update_chain_post_reaction_counts();
    """))

    print("[OK] Reaction count trigger created")

    # Create trigger to update parent post counts when replies are added
    db.session.execute(text("""
        -- Function to update parent post comment counts
        CREATE OR REPLACE FUNCTION update_chain_post_reply_counts()
        RETURNS TRIGGER AS $$
        DECLARE
            current_parent_id VARCHAR(36);
        BEGIN
            IF TG_OP = 'INSERT' THEN
                IF NEW.parent_id IS NOT NULL THEN
                    -- Update direct parent comment_count
                    UPDATE chain_posts SET comment_count = comment_count + 1 WHERE id = NEW.parent_id;

                    -- Update all ancestor posts' total_replies
                    current_parent_id := NEW.parent_id;
                    WHILE current_parent_id IS NOT NULL LOOP
                        UPDATE chain_posts SET total_replies = total_replies + 1 WHERE id = current_parent_id;
                        SELECT parent_id INTO current_parent_id FROM chain_posts WHERE id = current_parent_id;
                    END LOOP;
                END IF;
            ELSIF TG_OP = 'DELETE' THEN
                IF OLD.parent_id IS NOT NULL THEN
                    -- Update direct parent comment_count
                    UPDATE chain_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.parent_id;

                    -- Update all ancestor posts' total_replies
                    current_parent_id := OLD.parent_id;
                    WHILE current_parent_id IS NOT NULL LOOP
                        UPDATE chain_posts SET total_replies = GREATEST(0, total_replies - 1) WHERE id = current_parent_id;
                        SELECT parent_id INTO current_parent_id FROM chain_posts WHERE id = current_parent_id;
                    END LOOP;
                END IF;
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_chain_post_reply_counts ON chain_posts;
        CREATE TRIGGER trigger_update_chain_post_reply_counts
        AFTER INSERT OR DELETE ON chain_posts
        FOR EACH ROW EXECUTE FUNCTION update_chain_post_reply_counts();
    """))

    print("[OK] Reply count trigger created")

    # Create trigger to update last_activity_at on replies
    db.session.execute(text("""
        -- Function to update last_activity_at when replies are added
        CREATE OR REPLACE FUNCTION update_chain_post_activity()
        RETURNS TRIGGER AS $$
        DECLARE
            current_parent_id VARCHAR(36);
        BEGIN
            IF TG_OP = 'INSERT' THEN
                IF NEW.parent_id IS NOT NULL THEN
                    -- Update all ancestor posts' last_activity_at
                    current_parent_id := NEW.parent_id;
                    WHILE current_parent_id IS NOT NULL LOOP
                        UPDATE chain_posts SET last_activity_at = NEW.created_at WHERE id = current_parent_id;
                        SELECT parent_id INTO current_parent_id FROM chain_posts WHERE id = current_parent_id;
                    END LOOP;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_chain_post_activity ON chain_posts;
        CREATE TRIGGER trigger_update_chain_post_activity
        AFTER INSERT ON chain_posts
        FOR EACH ROW EXECUTE FUNCTION update_chain_post_activity();
    """))

    print("[OK] Activity timestamp trigger created")

    db.session.commit()

    print("\n[SUCCESS] All chain posts forum tables created successfully!")
    print("\nSummary:")
    print("   - chain_posts (Reddit-style discussion threads)")
    print("   - chain_post_reactions (upvote/downvote system)")
    print("   - Automatic count updates via triggers")
    print("   - Nested comment threading support")
    print("   - Activity tracking for hot/trending sorting")
    print("\nDatabase schema is ready for the Chain Forum feature!")
