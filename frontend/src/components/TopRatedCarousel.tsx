'use client';

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, ArrowRight, Star, Award, Users, MessageSquare } from 'lucide-react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css/navigation';
import 'swiper/css';

import { Project } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import { InteractiveScrollBackground } from '@/components/InteractiveScrollBackground';

interface TopRatedCarouselProps {
  projects: Project[];
  categoryName?: string;
}

export function TopRatedCarousel({
  projects,
  categoryName = 'top-rated',
}: TopRatedCarouselProps) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  // Daily rotation logic - changes every 24 hours
  const dailyRotatedProjects = useMemo(() => {
    if (projects.length === 0) return [];

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );

    const shuffled = [...projects];
    let seed = dayOfYear * 12345;

    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [projects]);

  const css = `
    .carousel-top-rated {
      padding: 20px 0 !important;
      overflow: visible !important;
    }

    .carousel-top-rated .swiper-wrapper {
      overflow: visible !important;
    }

    .carousel-top-rated .swiper-slide {
      overflow: visible !important;
    }

    .carousel-top-rated .swiper-button-next,
    .carousel-top-rated .swiper-button-prev {
      background: transparent;
      color: hsl(var(--foreground));
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .carousel-top-rated .swiper-button-next:hover,
    .carousel-top-rated .swiper-button-prev:hover {
      background: rgba(0, 0, 0, 0.1);
      transform: scale(1.1);
    }

    .carousel-top-rated .swiper-button-next::after,
    .carousel-top-rated .swiper-button-prev::after {
      content: '';
    }
  `;

  const getCrewInfo = (project: Project): string => {
    const teamMembers = project.teamMembers || project.team_members;
    if (teamMembers && teamMembers.length > 0) {
      return teamMembers.slice(0, 2).map(m => m.name || 'Anonymous').join(' & ');
    }
    return 'Solo Build';
  };

  const getDisplayName = (project: Project): string => {
    return project.author?.displayName || project.author?.display_name || project.author?.username || 'Anonymous';
  };

  const getAvatarUrl = (project: Project): string | undefined => {
    return project.author?.avatar || project.author?.avatar_url;
  };

  const handleCardClick = () => {
    const project = dailyRotatedProjects[activeIndex];
    if (project) {
      navigate(`/project/${project.id}`);
    }
  };

  return (
    <div className="relative w-full">
      <style>{css}</style>

      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            Top Rated Projects
          </h2>
          <div className="hidden sm:flex ml-auto text-sm text-muted-foreground font-medium items-center gap-3">
            <span>
              <span className="text-primary font-bold">{dailyRotatedProjects.length}</span>
              &nbsp;projects
            </span>
            {categoryName && (
              <button
                onClick={() => navigate(`/gallery/${categoryName}`)}
                className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
                title="View all projects in this category"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <motion.div
        initial={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          duration: 0.3,
          delay: 0.1,
        }}
        className="relative w-full"
      >
        {dailyRotatedProjects.length > 0 ? (
          <Swiper
            spaceBetween={30}
            autoplay={{
              delay: 5000,
              disableOnInteraction: true,
            }}
            grabCursor={true}
            centeredSlides={true}
            loop={dailyRotatedProjects.length > 1}
            slidesPerView="auto"
            onSlideChange={(swiper) => {
              setActiveIndex(swiper.realIndex);
            }}
            navigation={{
              nextEl: '.top-rated-button-next',
              prevEl: '.top-rated-button-prev',
            }}
            className="carousel-top-rated"
            modules={[Autoplay, Navigation]}
          >
            {dailyRotatedProjects.map((project, index) => {
              const isActive = index === activeIndex;

              return (
                <SwiperSlide
                  key={project.id}
                  className={`!w-full sm:!w-auto flex items-center justify-center`}
                >
                  <div className="w-full sm:w-[760px] md:w-[820px]">
                    {/* Main Card - Fixed Height */}
                    <div
                      onClick={isActive ? handleCardClick : undefined}
                      className={`relative flex flex-col overflow-hidden card-interactive transition-all duration-300 h-[380px] md:h-[420px] ${
                        !isActive ? 'opacity-60' : ''
                      } ${isActive ? 'cursor-pointer hover:shadow-lg' : ''}`}
                    >
                      <InteractiveScrollBackground className="text-primary/20" />
                      {/* Collapsed View - Full Card with Better Structure */}
                      <div className="flex flex-col h-full overflow-hidden relative z-10">
                        {/* Top Section - Title and Ranking */}
                        <div className="flex-shrink-0 border-b border-border/30 px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-900/40 to-transparent">
                          <div className="flex items-start gap-2 justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg sm:text-xl font-black text-foreground line-clamp-2 leading-tight">
                                {project.title}
                              </h3>
                            </div>
                            <div className="flex-shrink-0 bg-primary text-black px-2.5 py-1 rounded-full text-xs font-bold">
                              #{index + 1}
                            </div>
                          </div>
                        </div>

                        {/* Middle Section - User, Crew, Description */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-3">
                          {/* User and Crew Info */}
                          <div className="space-y-2">
                            {/* Builder */}
                            <div className="flex items-center gap-2">
                              {getAvatarUrl(project) ? (
                                <img
                                  src={getAvatarUrl(project)}
                                  alt={getDisplayName(project)}
                                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                  {getDisplayName(project)[0].toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">
                                  {getDisplayName(project)}
                                </p>
                              </div>
                            </div>

                            {/* Crew Members */}
                            {(project.teamMembers || project.team_members)?.length > 0 && (
                              <div className="pl-1">
                                <p className="text-[10px] text-muted-foreground font-medium mb-1.5">
                                  Crew ({(project.teamMembers || project.team_members)!.length}):
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(project.teamMembers || project.team_members)!.slice(0, 5).map((member, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/40 border border-border/30 text-[10px] font-medium text-foreground"
                                    >
                                      {member.avatar || member.avatar_url || member.image ? (
                                        <img
                                          src={member.avatar || member.avatar_url || member.image}
                                          alt={member.name}
                                          className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded-full bg-accent/30 flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                          {member.name[0]?.toUpperCase()}
                                        </div>
                                      )}
                                      <span className="truncate">
                                        {member.name}
                                      </span>
                                    </div>
                                  ))}
                                  {(project.teamMembers || project.team_members)!.length > 5 && (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/40 border border-border/30 text-[10px] font-medium text-muted-foreground">
                                      +{(project.teamMembers || project.team_members)!.length - 5} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                              {project.description}
                            </p>
                          </div>

                          {/* Tech Stack */}
                          {project.techStack && project.techStack.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-medium mb-1.5">
                                Tech:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {project.techStack.slice(0, 4).map((tech) => (
                                  <span
                                    key={tech}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold"
                                  >
                                    {tech}
                                  </span>
                                ))}
                                {project.techStack.length > 4 && (
                                  <span className="text-[10px] px-2 py-0.5 text-muted-foreground font-medium">
                                    +{project.techStack.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Action Bar - Vote and Comments */}
                        <div className="flex-shrink-0 border-t border-border/40 px-4 sm:px-5 py-2.5 flex items-center gap-2 bg-card/60 backdrop-blur-sm">
                          <div className="flex-1">
                            <VoteButtons
                              projectId={project.id}
                              voteCount={project.voteCount}
                              userVote={project.userVote as 'up' | 'down' | null}
                              projectOwnerId={project.authorId || project.user_id}
                            />
                          </div>
                          <button className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth border border-border text-xs font-medium">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{project.commentCount || 0}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </SwiperSlide>
              );
            })}

            {/* Navigation Buttons */}
            <>
              <div className="top-rated-button-prev absolute left-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer">
                <ChevronLeftIcon className="h-6 w-6 text-foreground" />
              </div>
              <div className="top-rated-button-next absolute right-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer">
                <ChevronRightIcon className="h-6 w-6 text-foreground" />
              </div>
            </>
          </Swiper>
        ) : (
          <div className="flex items-center justify-center h-[380px] md:h-[420px] rounded-lg border border-border/40 bg-secondary/20">
            <div className="text-center">
              <p className="text-muted-foreground font-medium">
                No top rated projects found
              </p>
            </div>
          </div>
        )}

        {/* Mobile hint */}
        <div className="sm:hidden mt-3 text-center text-xs text-muted-foreground font-medium">
          Swipe to explore →
        </div>
      </motion.div>
    </div>
  );
}
