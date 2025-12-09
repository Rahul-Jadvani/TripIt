"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, ArrowRight, Sparkles } from 'lucide-react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css/navigation';
import 'swiper/css';

import { Project } from '@/types';
import { ItineraryCard } from '@/components/ItineraryCard';

// Placeholder SVG with Sparkles icon (matching RemixPage style)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect width="800" height="600" fill="%23f0f0f0"/%3E%3Cg transform="translate(400,300)"%3E%3Cpath fill="%23f66926" opacity="0.5" d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21L12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" transform="translate(-12,-11.5) scale(4)"%3E%3C/path%3E%3C/g%3E%3C/svg%3E';

interface TopRatedCarouselProps {
  projects: Itinerary[];
  categoryName?: string;
  customNavigatePath?: string;
}

export function TopRatedCarousel({
  projects,
  categoryName = "top-rated",
  customNavigatePath,
}: TopRatedCarouselProps) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Daily rotation logic - changes every 24 hours
  const dailyRotatedProjects = useMemo(() => {
    if (projects.length === 0) return [];

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        86400000
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

  // Add placeholder image for projects without screenshots
  const projectsWithPlaceholders = useMemo(() => {
    return dailyRotatedProjects.map(project => ({
      ...project,
      screenshots: project.screenshots?.length > 0
        ? project.screenshots
        : [PLACEHOLDER_IMAGE]
    }));
  }, [dailyRotatedProjects]);

  // IntersectionObserver to auto-play only when in viewport
  useEffect(() => {
    if (!carouselRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (swiperRef.current) {
          if (entry.isIntersecting) {
            swiperRef.current.autoplay?.start();
          } else {
            swiperRef.current.autoplay?.stop();
          }
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

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

  return (
    <div className="relative w-full" ref={carouselRef}>
      <style>{css}</style>

      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          {/* <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            Top Rated Projects
          </h2> */}
          <div className="hidden sm:flex ml-auto text-sm text-muted-foreground font-medium items-center gap-3">
            <span>
              <span className="text-primary font-bold">
                {dailyRotatedProjects.length}
              </span>
              &nbsp;projects
            </span>
            {categoryName && (
              <button
                onClick={() =>
                  navigate(customNavigatePath || `/gallery/${categoryName}`)
                }
                className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
                title={
                  customNavigatePath
                    ? "View your itineraries"
                    : "View all projects in this category"
                }
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
        {projectsWithPlaceholders.length > 0 ? (
          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            spaceBetween={20}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            grabCursor={true}
            centeredSlides={false}
            loop={true}
            slidesPerView={1}
            slidesPerGroup={3}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 24,
              },
            }}
            onSlideChange={(swiper) => {
              setActiveIndex(swiper.realIndex);
            }}
            navigation={{
              nextEl: ".top-rated-button-next",
              prevEl: ".top-rated-button-prev",
            }}
            className="carousel-top-rated"
            modules={[Autoplay, Navigation]}
          >
            {projectsWithPlaceholders.map((project, index) => {
              return (
                <SwiperSlide
                  key={project.id}
                  className="!h-auto"
                >
                  <div className="w-full h-full">
                    {/* Rank Badge */}
                    <div className="flex justify-end mb-2">
                      <div className="bg-primary text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>
                    </div>

                    {/* Use the ItineraryCard */}
                    <ItineraryCard project={project} />
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
          <div className="flex items-center justify-center h-96 rounded-lg border border-border/40 bg-secondary/20">
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