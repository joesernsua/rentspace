import { useState, type FormEvent } from "react";
import { createEnquiry } from "../services/enquiry.service";

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export default function EnquiryForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const enquiry = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      message: formData.message.trim(),
    };

    if (Object.values(enquiry).some((value) => !value)) {
      setFeedback({
        type: "error",
        message: "Please complete all fields before submitting your enquiry.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createEnquiry(enquiry);
      setFormData(initialFormData);
      setFeedback({
        type: "success",
        message: "Thank you. Your enquiry has been submitted.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "We could not submit your enquiry. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-background-700 px-4 py-20 font-serif text-background-50 md:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-secondary-300">
            Private Enquiries
          </p>
          <h2 className="text-3xl uppercase leading-tight tracking-wider text-white md:text-4xl">
            Discover Your Place At Westfield
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-background-300 md:text-lg">
            Share your details with us and our property team will be in touch
            to assist with your enquiry.
          </p>
        </div>

        <form
          className="grid grid-cols-1 gap-6 border border-white/10 bg-background-800/60 p-6 shadow-2xl md:grid-cols-2 md:p-10 lg:col-span-7"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="flex flex-col gap-2 text-sm uppercase tracking-widest text-secondary-300">
            Name
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-base normal-case tracking-normal text-white outline-none transition-colors focus:border-secondary-400"
              autoComplete="name"
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm uppercase tracking-widest text-secondary-300">
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(event) =>
                setFormData({ ...formData, email: event.target.value })
              }
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-base normal-case tracking-normal text-white outline-none transition-colors focus:border-secondary-400"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm uppercase tracking-widest text-secondary-300 md:col-span-2">
            Phone
            <input
              type="tel"
              value={formData.phone}
              onChange={(event) =>
                setFormData({ ...formData, phone: event.target.value })
              }
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-base normal-case tracking-normal text-white outline-none transition-colors focus:border-secondary-400"
              autoComplete="tel"
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm uppercase tracking-widest text-secondary-300 md:col-span-2">
            Message
            <textarea
              value={formData.message}
              onChange={(event) =>
                setFormData({ ...formData, message: event.target.value })
              }
              className="min-h-36 resize-y border border-background-600 bg-background-900/40 px-4 py-3 text-base normal-case tracking-normal text-white outline-none transition-colors focus:border-secondary-400"
              disabled={isSubmitting}
            />
          </label>

          {feedback && (
            <p
              className={`text-sm md:col-span-2 ${
                feedback.type === "success"
                  ? "text-background-300"
                  : "text-secondary-300"
              }`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}

          <button
            type="submit"
            className="bg-secondary-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-background-900 transition-colors hover:bg-secondary-300 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 md:justify-self-start"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Enquiry"}
          </button>
        </form>
      </div>
    </section>
  );
}
