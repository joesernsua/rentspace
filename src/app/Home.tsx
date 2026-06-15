import HeroTwo from "./HeroTwo";
import HeroThree from "./HeroThree";
import { HeroFour, HeroFourText } from "./HeroFour";
import { HeroFive, HeroFiveNext } from "./HeroFive";
import Overview from "../components/Overview";
import ConnectSanct from "../components/ConnectSanct";
import FacilitiesHero from "../components/FacilitiesHero";
import MasterPlanHero from "../components/MasterPlanHero";
import JourneyMap from "../components/JourneyMap";
import EnquiryForm from "../components/EnquiryForm";
import AppointmentForm from "../components/AppointmentForm";

export default function Home() {
  return (
    <div className=" font-family overflow-hidden">
      <Overview />

      <section className="bg-background-200 flex flex-col items-center max-w-full">
        <HeroTwo></HeroTwo>
        <HeroThree></HeroThree>
      </section>

      <section>
        <HeroFive></HeroFive>
      </section>
      <section>
        <HeroFiveNext></HeroFiveNext>
      </section>

      <ConnectSanct />


      <section className="bg-background-200 flex flex-col items-center max-w-full relative py-24">
        <HeroFour></HeroFour>
        <HeroFourText></HeroFourText>
      </section>

      <FacilitiesHero />
      <MasterPlanHero />
      <JourneyMap />
      <AppointmentForm />
      <EnquiryForm />
    </div>
  );
}
