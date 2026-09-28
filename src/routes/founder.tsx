import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Linkedin } from "lucide-react";
import { SimpleFooter, SimpleHeader } from "@/components/simple-layout";

const CANONICAL = "https://sentia-plants.com/founder";

export const Route = createFileRoute("/founder")({
  component: FounderPage,
  head: () => ({
    meta: [
      { title: "About Marco — Founder of Sentia" },
      {
        name: "description",
        content:
          "Read Marco's story, from growing up surrounded by nature in Mexico to founding Sentia and building technology for greener homes and communities.",
      },
      { property: "og:title", content: "About Marco — Founder of Sentia" },
      {
        property: "og:description",
        content:
          "Read Marco's story, from growing up surrounded by nature in Mexico to founding Sentia and building technology for greener homes and communities.",
      },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "About Marco — Founder of Sentia" },
      {
        name: "twitter:description",
        content:
          "Read Marco's story, from growing up surrounded by nature in Mexico to founding Sentia and building technology for greener homes and communities.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function FounderPage() {
  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link
          to="/about"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" />
          About Sentia
        </Link>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-sm font-medium text-primary">Marco Perdomo, founder of Sentia</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">About Me</h1>
        </header>

        <article className="mt-10 space-y-6 text-base leading-8 text-foreground sm:text-lg">
          <p>My name is Marco. I was born in Mexico. I was raised in the mid-country side in the city of Toluca, an industrial city west of Mexico City. All of my early years were surrounded by mountains, evergreen trees, valleys, cornfields, lakes, farms and house pets.</p>

          <p>One of my core memories as a child was seeing my dogs run free and play in my parent's green backyard. They grew all kinds of fruit trees: apples, pears, plums, peaches, walnuts; so we could always enjoy some fresh goods produced right there, in our backyard. My mom also filled up our home space with a large collection of indoor plants. She was a big enthusiast and took care of them with deep love, telling me everything about their features, their constant growing leaves and sometimes even releasing an incredible perfume that permeated our entire home during the flowering season. I also reminisce about the times we would play soccer or play in the cornfields or get dirty while having fun doing whatever a kid's imagination would create. I still recall one of the most incredible spectacles of nature: hundreds (if not thousands) of fireflies dancing up and down the garden during spring. This only lives now in my memory because urbanization has either displaced these critters or made them disappear from the area entirely.</p>

          <p>I was also fascinated by how things work and dreamed about one day being able to build my own robots. I have a degree in Mechatronics Engineering. I moved to Scotland about 8 years ago to study a Master's degree in Oil and Gas Management. However, I realized that a career in this field would go against my core values. It felt like betraying all the good things I saw when I grew up. I moved to Amsterdam around 6 years ago, where I am currently based. I have been working in Financial Technology for about the same time. During this time, I earned my second Master's degree in Artificial Intelligence. I have learned a lot of interesting things and met some great people along this journey. Nevertheless, there has been something inside me that calls for something different, itching louder in recent years.</p>

          <p>Besides the urge to learn about technology and thrive in the modern world, I used to imagine a world where nature blended in together with human society. I firmly believe that humans are not meant to live an individualistic life filled with overflowing privileges, and that we should, in a way, adapt and blend in with nature. For long enough (centuries at least) we have destroyed multiple ecosystems all around the world and we have been paying the toll. The climate is changing, food security worldwide is compromised due to declining soil health, social gaps are furtherly increasing. The land is being used to build more and more urban centers, industrialize, and more recently, being used to build more datacenters to support AI infrastructure. It saddens me.</p>

          <p>This is where Sentia comes in. It is one of my first projects in an umbrella of ventures to contribute towards regenerating Earth. Sentia is an effort to educate and change how modern society can contribute to a healthy indoor 'jungle', contributing toward sustaining a greener environment. Through the application of modern technology and human connection, I believe we can start making a change in managing an indoor space where a wide variety of plants can thrive.</p>

          <p>Sentia aims to go beyond scheduling when to water your plants. Plants are complex systems that should be understood holistically, and watering is just one of the multiple variables that contribute towards their health. The aim of Sentia is to enable you to be a steward of nature. Sentia is a platform that provides you with the right tools and enables education to understand truly what your plants need. Additionally, Sentia brings you together with plant lovers out there to create an engaging community where we can help each other.</p>

          <p>(Sentia provides a single platform where the following technologies meet: Artificial Intelligence, Internet of Things (IoT), education platform, and social media features, as a full stack of tools that help you achieve that endeavour)</p>

          <p>Sentia is not enough, I know. One person can only have so much impact. But this is a first step towards my ultimate goal to regenerate ecosystems on Earth, and create a community upheld with human values that is economically sustainable to future generations. I hope this can inspire others with a similar mindset to contribute towards a greener future. For further information on other bigger side projects, (for now) you can follow me on: LinkedIn. Feel free to reach out to me if you have any ideas, want to collaborate or just to chat. Nothing makes me happier than talking to like-minded people. I hope we can connect and thrive in a community where these values are important.</p>

          <p className="font-display text-2xl font-semibold text-primary">Happy planting!</p>
        </article>

        <div className="mt-10 border-t border-border pt-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Linkedin className="h-4 w-4" />
            Marco's LinkedIn profile will be added here once the address is available.
          </p>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}