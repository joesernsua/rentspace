import React from "react";
import {
  FaPhoneAlt,
  FaPrint,
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaMapMarkerAlt,
  FaChevronUp,
} from "react-icons/fa";
import { SiWaze } from "react-icons/si";

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#2E3830] text-[#ABBAAE] py-12 px-6 font-serif relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-center">
          <div className="xl:col-span-8 flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
            <div className="flex flex-col items-center shrink-0">
              <span className="text-xs text-white uppercase tracking-[0.3em] opacity-90 mb-4">
                Crafted By
              </span>
              {/* 
              change image logo here
              */}
              <img
                src="/scplogo.png"
                alt="footer_scp_property"
                className="w-40 lg:w-48 h-auto object-contain"
              />
              <p className="text-white mt-2 tracking-widest">Property</p>
            </div>

            <div className="flex flex-col gap-6 text-center lg:text-left">
              <div>
                <h4 className="font-bold text-white uppercase tracking-wider mb-2 text-sm md:text-base">
                  KIARA SQUARE SDN BHD{" "}
                  <span className="block md:inline font-normal opacity-70">
                    201801038393 (1300424-H)
                  </span>
                </h4>
                <p className="leading-relaxed opacity-90 text-white text-sm md:text-base max-w-md mx-auto lg:mx-0">
                  101, Block D, Phileo Damansara 1, Jalan 16/11,
                  <br />
                  46350 Petaling Jaya, Malaysia
                </p>
              </div>

              <div className="flex flex-wrap gap-4 md:gap-8 items-center justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-white text-sm md:text-base">
                  <FaPhoneAlt className="text-secondary-400" />
                  <span>03-7665 1228</span>
                </div>
                <div className="flex items-center gap-2 text-white text-sm md:text-base">
                  <FaPrint className="text-secondary-400" />
                  <span>03-7665 1223</span>
                </div>
              </div>

              <div className="flex gap-6 text-2xl justify-center lg:justify-start">
                <FaWhatsapp className="hover:text-white cursor-pointer transition-colors text-secondary-400" />
                <SiWaze className="hover:text-white cursor-pointer transition-colors text-secondary-400" />
                <FaMapMarkerAlt className="hover:text-white cursor-pointer transition-colors text-secondary-400" />
                <FaFacebookF className="hover:text-white cursor-pointer transition-colors text-secondary-400" />
                <FaInstagram className="hover:text-white cursor-pointer transition-colors text-secondary-400" />
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 flex flex-col items-center xl:items-end w-full border-t xl:border-t-0 xl:border-l border-white/10 pt-10 xl:pt-0 xl:pl-10">
            <p className="text-sm uppercase tracking-widest mb-3 italic text-center xl:text-right">
              For further enquiries, please contact:
            </p>
            <a
              href="tel:01165519090"
              className="text-3xl md:text-5xl font-light text-white hover:text-secondary-400 transition-colors tracking-tighter"
            >
              011 6551 9090
            </a>
            {/* 
            change website URL here, href and text
          */}
            <a
              href="https://www.scpgroup.com.my"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] md:text-xs tracking-[0.3em] mt-4 uppercase opacity-60 hover:opacity-100 transition-opacity"
            >
              www.scpgroup.com.my
            </a>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs md:text-sm uppercase tracking-widest text-center md:text-left text-white/70">
            © {new Date().getFullYear()} SCP Westfield Residences. All Rights
            Reserved. |{" "}
            <span className="cursor-pointer hover:underline hover:text-white transition-colors">
              Disclaimer
            </span>
          </p>

          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="p-3 border border-white/20 rounded-full hover:bg-secondary-400 hover:border-secondary-400 hover:text-[#2E3830] transition-all group"
          >
            <FaChevronUp className="group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
