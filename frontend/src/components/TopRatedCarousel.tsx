"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, ArrowRight } from "lucide-react";
import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css/navigation";
import "swiper/css";

import { Itinerary } from "@/types";
import { ItineraryCard } from "@/components/ItineraryCard";

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
              nextEl: ".top-rated-button-next",
              prevEl: ".top-rated-button-prev",
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
                  <div
                    className={`w-full sm:w-[480px] md:w-[520px] transition-all duration-300 ${
                      !isActive
                        ? "opacity-60 scale-95"
                        : "opacity-100 scale-100"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="flex justify-end mb-2">
                      <div className="bg-primary text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>
                    </div>

                    {/* Use the new ItineraryCard */}
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
