"use client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpen, Gamepad, TrendingUp, User } from "lucide-react";
import Link from "next/link";

interface featureProps {
  title: string;
  description: string;
  icon: typeof BookOpen;
}
const features: featureProps[] = [
  {
    title: "Comprehensive Course",
    description:
      "Access a wide range of carefully curated course designed by industry experts.",
    icon: BookOpen,
  },
  {
    title: "Interactive Learning",
    description:
      "Engage with interactive content,quizzes, and assignment to enhance your learning experience",
    icon: Gamepad,
  },
  {
    title: "Progress Tracking",
    description:
      "Monitor your progress and achievement with detailed analytics and personalized dashboards",
    icon: TrendingUp,
  },
  {
    title: "Community Support",
    description:
      "Join a vibrant community of learners and instructors to collaborate and share knowledge",
    icon: User,
  },
];

export default function Home() {
  return (
    <>
      <section className="relative py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <Badge variant={"outline"}>The future of Online Education</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Elevate your Learning Experience
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Discover a new way to learn with modern, interactive learning
            management system. Access high-quality courses anytime, anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              className={buttonVariants({
                size: "lg",
              })}
              href="/courses"
            >
              Explore Course
            </Link>
            <Link
              className={buttonVariants({
                size: "lg",
                variant: "outline",
              })}
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 px-4 max-w-7xl mx-auto mb-32">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader className="flex flex-col items-center text-center space-y-4 pb-4">
                <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {feature.title}
                </h3>
              </CardHeader>
              <CardContent className="text-center px-6 pb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}
