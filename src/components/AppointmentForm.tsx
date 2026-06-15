import { useState, type FormEvent } from "react";
import { createAppointment } from "../services/appointment.service";

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  preferredDate: "",
  preferredTime: "",
  unitType: "",
  message: "",
};

const unitTypeOptions = [
  "Type A",
  "Type B",
  "Type C",
  "Penthouse",
  "Not sure yet",
];

export default function AppointmentForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const appointment = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      unitType: formData.unitType,
      message: formData.message.trim(),
    };

    const requiredFields = [
      appointment.name,
      appointment.email,
      appointment.phone,
      appointment.preferredDate,
      appointment.preferredTime,
      appointment.unitType,
    ];

    if (requiredFields.some((value) => !value)) {
      setFeedback({
        type: "error",
        message:
          "Please complete all required fields before requesting an appointment.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createAppointment(appointment);
      setFormData(initialFormData);
      setFeedback({
        type: "success",
        message: "Thank you. Your appointment request has been submitted.",
      });
    } catch {
      setFeedback({
        type: "error",
        message:
          "We could not submit your appointment request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "border border-background-600 bg-background-900/40 px-4 py-3 text-base normal-case tracking-normal text-white outline-none transition-colors focus:border-secondary-400";
  const labelClassName =
    "flex flex-col gap-2 text-sm uppercase tracking-widest text-secondary-300";

  return (
    <section className="bg-background-700 px-4 py-20 font-serif text-background-50 md:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-secondary-300">
            Private Viewing
          </p>
          <h2 className="text-3xl uppercase leading-tight tracking-wider text-white md:text-4xl">
            Arrange Your Appointment
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-background-300 md:text-lg">
            Select your preferred date, time, and residence type. Our property
            team will contact you to confirm your private viewing.
          </p>
        </div>

        <form
          className="grid grid-cols-1 gap-6 border border-white/10 bg-background-800/60 p-6 shadow-2xl md:grid-cols-2 md:p-10 lg:col-span-7"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className={labelClassName}>
            Name
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              className={inputClassName}
              autoComplete="name"
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(event) =>
                setFormData({ ...formData, email: event.target.value })
              }
              className={inputClassName}
              autoComplete="email"
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Phone
            <input
              type="tel"
              value={formData.phone}
              onChange={(event) =>
                setFormData({ ...formData, phone: event.target.value })
              }
              className={inputClassName}
              autoComplete="tel"
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Unit Type
            <select
              value={formData.unitType}
              onChange={(event) =>
                setFormData({ ...formData, unitType: event.target.value })
              }
              className={inputClassName}
              disabled={isSubmitting}
            >
              <option value="" className="bg-background-900">
                Select a unit type
              </option>
              {unitTypeOptions.map((unitType) => (
                <option
                  key={unitType}
                  value={unitType}
                  className="bg-background-900"
                >
                  {unitType}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClassName}>
            Preferred Date
            <input
              type="date"
              value={formData.preferredDate}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  preferredDate: event.target.value,
                })
              }
              className={inputClassName}
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Preferred Time
            <input
              type="time"
              value={formData.preferredTime}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  preferredTime: event.target.value,
                })
              }
              className={inputClassName}
              disabled={isSubmitting}
            />
          </label>

          <label className={`${labelClassName} md:col-span-2`}>
            Message <span className="normal-case tracking-normal">(Optional)</span>
            <textarea
              value={formData.message}
              onChange={(event) =>
                setFormData({ ...formData, message: event.target.value })
              }
              className={`${inputClassName} min-h-36 resize-y`}
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
            {isSubmitting ? "Submitting..." : "Request Appointment"}
          </button>
        </form>
      </div>
    </section>
  );
}
