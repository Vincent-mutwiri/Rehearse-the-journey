export const SCENARIOS = {
      hospital: {
        title: "Hospital Reception",
        icon: "🏥",
        speakers: {
          primary: "Receptionist Joy",
          secondary: "Waiting Patient"
        },
        levels: {
          1: {
            opening: "Good morning. Welcome to Nairobi Hospital. How can I help you today?",
            hints: ["I have an appointment.", "I am visiting Dr. Kamau.", "Where is the registration desk?"],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (lower.includes("not sure") || lower.includes("lost") || lower.includes("confused")) {
                return {
                  speaker: "Receptionist Joy",
                  text: "That is completely okay. Take your time. Do you have your appointment card, or can you tell me your name?",
                  hints: ["My name is on this card.", "I am here for a regular checkup."]
                };
              }
              if (turn === 0 || lower.includes("appointment") || lower.includes("visiting") || lower.includes("doctor")) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Thank you. Do you have your National ID or clinic registration card with you today?",
                  hints: ["Yes, I have my ID right here.", "No, I forgot it at home.", "I only have my phone number."]
                };
              } else if (turn === 1 || lower.includes("id") || lower.includes("card") || lower.includes("yes")) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Perfect. Please have a seat in Waiting Area B down the hall on your left. The nurse will call your name shortly.",
                  hints: ["Thank you very much.", "Which door is Area B again?", "How long is the wait?"]
                };
              } else {
                return {
                  speaker: "Receptionist Joy",
                  text: "Area B is just past the pharmacy counter. You are all set. Have a restful visit.",
                  hints: ["Thank you, have a good day.", "Goodbye."]
                };
              }
            }
          },
          2: {
            opening: "Habari, welcome. Are you here for a scheduled clinic appointment or walk-in consultation?",
            hints: ["I have a scheduled clinic appointment.", "I need a walk-in consultation.", "I'm not sure which one."],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (turn === 0) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Understood. Which clinic department are you looking for—General Outpatient, Dental, or Eye Clinic?",
                  hints: ["General Outpatient.", "The Dental clinic.", "Could you help me check?"]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Got it. First please verify your insurance details or paying method at Counter 2 right behind you.",
                  hints: ["I am using SHA / NHIF insurance.", "I will pay with M-Pesa.", "Where is Counter 2?"]
                };
              } else {
                return {
                  speaker: "Receptionist Joy",
                  text: "Counter 2 is clearly marked with the green sign. Once verified, take token number 14. You are welcome!",
                  hints: ["Thank you for explaining.", "Asante sana."]
                };
              }
            }
          },
          3: {
            opening: "Good morning. I see your file here, but Dr. Otieno's consultation room has just moved to Wing C on the second floor.",
            hints: ["How do I get to Wing C?", "Is there an elevator?", "Will my appointment time change?"],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (lower.includes("elevator") || lower.includes("stairs") || lower.includes("get")) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Take the lift past the cafeteria up to Level 2. Once you step out, turn right and Wing C is directly ahead.",
                  hints: ["Understood, thank you.", "Could you repeat that one more time?"]
                };
              } else if (lower.includes("repeat") || lower.includes("again")) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Certainly: Take the lift past the cafeteria to Level 2, then turn right. Take your time, there is no hurry.",
                  hints: ["Thank you so much.", "I will head there now."]
                };
              } else {
                return {
                  speaker: "Receptionist Joy",
                  text: "Your appointment time remains exactly the same. The nurse is already notified that you are on your way.",
                  hints: ["Thank you for your help.", "Have a good morning."]
                };
              }
            }
          },
          4: {
            opening: "Good morning. Welcome to Nairobi Hospital. Please let me know who you are checking in for.",
            hints: ["I am checking in for myself.", "I have an appointment with Dr. Kamau."],
            branch: (input, turn) => {
              if (turn === 0) {
                return {
                  speaker: "Waiting Patient",
                  text: "Excuse me, sorry to interrupt—is this the queue for file collection or consultation registration?",
                  hints: ["This line is for consultation registration.", "I am waiting to speak with the receptionist."]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Receptionist Joy",
                  text: "Thank you for clarifying for them! Now, back to you: could you please hand me your registration slip?",
                  hints: ["Here is my registration slip.", "I only have my National ID number."]
                };
              } else {
                return {
                  speaker: "Receptionist Joy",
                  text: "Everything is stamped and confirmed. You may proceed straight to Clinic Room 4. Take care!",
                  hints: ["Thank you both.", "Asante sana!"]
                };
              }
            }
          }
        }
      },
      matatu: {
        title: "Matatu Stage",
        icon: "🚐",
        speakers: {
          primary: "Conductor Otieno",
          secondary: "Fellow Passenger"
        },
        levels: {
          1: {
            opening: "Sasa! Westlands direct. One seat left at the front. Are you boarding?",
            hints: ["Yes, how much is the fare?", "Does this matatu pass Safaricom house?", "No, I need another stage."],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (turn === 0 || lower.includes("fare") || lower.includes("how much")) {
                return {
                  speaker: "Conductor Otieno",
                  text: "Fare is fifty shillings flat today. Hop inside and take the window seat.",
                  hints: ["Can I pay via M-Pesa?", "Here is fifty shillings cash.", "Please alert me at my stop."]
                };
              } else if (turn === 1 || lower.includes("mpesa") || lower.includes("cash") || lower.includes("pay")) {
                return {
                  speaker: "Conductor Otieno",
                  text: "M-Pesa till number is painted right on the dashboard. Relax, we depart right away.",
                  hints: ["Thank you.", "Please drop me near the stage."]
                };
              } else {
                return {
                  speaker: "Conductor Otieno",
                  text: "Sure thing! I will shout your stage clearly when we arrive. Safe journey!",
                  hints: ["Asante conductor.", "Thank you."]
                };
              }
            }
          },
          2: {
            opening: "Nairobi CBD, Commercial! Where are you alighting along the highway?",
            hints: ["I am alighting at Museum Hill.", "I am going all the way to Commercial.", "Does this bus stop at Ngara?"],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (turn === 0) {
                return {
                  speaker: "Conductor Otieno",
                  text: "Yes, we drop at Museum Hill flyover. Fare is eighty shillings because of light morning traffic.",
                  hints: ["Eighty shillings is fair.", "Can you do seventy shillings?", "Is there change for five hundred?"]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Conductor Otieno",
                  text: "Change for five hundred is available, but if you have smaller notes or M-Pesa, that is much easier.",
                  hints: ["I will send via M-Pesa.", "I found exact eighty shillings cash."]
                };
              } else {
                return {
                  speaker: "Conductor Otieno",
                  text: "Sawazisha! Board through the middle door and settle in comfortably.",
                  hints: ["Thank you conductor.", "Asante."]
                };
              }
            }
          },
          3: {
            opening: "Board quickly, boss! But just a heads up: due to roadworks on Uhuru Highway, we are diverting via Riverside.",
            hints: ["Does the diversion still reach Westlands?", "How long will the diversion take?", "I might need to take another vehicle."],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (lower.includes("reach") || lower.includes("westlands") || lower.includes("long")) {
                return {
                  speaker: "Conductor Otieno",
                  text: "Yes, we still reach the main stage safely, just adding about ten minutes. Do you still wish to board?",
                  hints: ["Yes, that is fine with me.", "No thank you, I will wait for another bus."]
                };
              } else {
                return {
                  speaker: "Conductor Otieno",
                  text: "No problem at all! Feel free to decide without any pressure. Safe travels!",
                  hints: ["Thank you for telling me.", "Have a good trip."]
                };
              }
            }
          },
          4: {
            opening: "Commercial! Two passengers needed. Step inside brother!",
            hints: ["Is this vehicle full?", "How much to town?"],
            branch: (input, turn) => {
              if (turn === 0) {
                return {
                  speaker: "Fellow Passenger",
                  text: "Excuse me, are you taking this window seat or may I squeeze past to the back row?",
                  hints: ["You can go ahead and take the back row.", "I am sitting here, please excuse me."]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Conductor Otieno",
                  text: "Pole pole, plenty of room for everyone. Boss, have your fare ready when we leave the stage.",
                  hints: ["Yes, I have exact fare ready.", "What is the till number?"]
                };
              } else {
                return {
                  speaker: "Conductor Otieno",
                  text: "Till is 5-4-3-2-1. Sit back, relax, and let me know if you need anything.",
                  hints: ["Thank you.", "Asante."]
                };
              }
            }
          }
        }
      },
      government: {
        title: "Government Service Office",
        icon: "🏛️",
        speakers: {
          primary: "Customer Officer Wanjiku",
          secondary: "Information Desk Officer"
        },
        levels: {
          1: {
            opening: "Welcome to Huduma Centre. Which public service are you looking to receive today?",
            hints: ["I need to renew my National ID.", "I need a certificate of good conduct.", "I need help finding the right desk."],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (turn === 0 || lower.includes("id") || lower.includes("renew")) {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "For National ID services, please have your birth certificate or previous ID photocopy ready.",
                  hints: ["I have both documents with me.", "I only have my old ID.", "I don't have copies."]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "That is completely fine. There is a photocopying desk at Counter 1, and biometric verification at Counter 6.",
                  hints: ["Thank you. Which counter should I visit first?", "How do I get a ticket?"]
                };
              } else {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "First get your paper ticket at Counter 1, then take a seat. Your number will appear on the digital screen.",
                  hints: ["Thank you for making that simple.", "Asante sana."]
                };
              }
            }
          },
          2: {
            opening: "Good afternoon. Please state the service you require and whether you made an eCitizen booking.",
            hints: ["I have an eCitizen booking invoice.", "I haven't booked online yet.", "Could you explain the process?"],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (turn === 0) {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "Excellent. Please present your printed receipt or show the confirmation SMS message on your mobile phone.",
                  hints: ["Here is the confirmation SMS.", "I have the printed receipt.", "Let me find the message."]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "The payment code is confirmed. Take token C-12 and proceed to Desk 8 for finger biometric capture.",
                  hints: ["Where is Desk 8 located?", "Thank you very much."]
                };
              } else {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "Desk 8 is in the middle row beneath the blue sign. A staff member will guide you into the booth.",
                  hints: ["Thank you for your assistance.", "Have a good day."]
                };
              }
            }
          },
          3: {
            opening: "Welcome. Our automated queuing system is temporarily undergoing maintenance, so we are calling names manually.",
            hints: ["How will I know when it's my turn?", "Where should I wait?", "Is the wait time longer?"],
            branch: (input, turn) => {
              return {
                speaker: "Customer Officer Wanjiku",
                text: "We will call your name clearly from the central desk. Please sit within the front two rows so you hear us easily.",
                hints: ["Thank you, I will sit in front.", "Could you note down my name?"]
              };
            }
          },
          4: {
            opening: "Good morning. Please check in with your documents.",
            hints: ["Good morning, I have my papers here.", "I need assistance with my form."],
            branch: (input, turn) => {
              if (turn === 0) {
                return {
                  speaker: "Information Desk Officer",
                  text: "Jambo! Pardon me, did you pick an official entry card at the entrance security gate?",
                  hints: ["Yes, here is the yellow visitor card.", "No, I did not receive one.", "Should I go back?"]
                };
              } else {
                return {
                  speaker: "Customer Officer Wanjiku",
                  text: "No need to go back outside! I can provide a visitor pass right here. Please sign this single line.",
                  hints: ["Thank you for saving me time.", "Here is my signature."]
                };
              }
            }
          }
        }
      },
      directions: {
        title: "Asking for Directions",
        icon: "🧭",
        speakers: {
          primary: "Passerby Maina",
          secondary: "Shopkeeper Amina"
        },
        levels: {
          1: {
            opening: "Habari! You look like you're searching for something. Which building are you trying to find?",
            hints: ["I am looking for the National Archives.", "Where is Kencom House?", "I am trying to find Moi Avenue."],
            branch: (input, turn) => {
              const lower = input.toLowerCase();
              if (turn === 0 || lower.includes("archives") || lower.includes("kencom")) {
                return {
                  speaker: "Passerby Maina",
                  text: "National Archives is very close! Walk straight ahead until you see the big clock tower.",
                  hints: ["Is it on the left or right side?", "Could you repeat that?", "Thank you!"]
                };
              } else if (turn === 1) {
                return {
                  speaker: "Passerby Maina",
                  text: "It will be directly on your left, right opposite the bus station. You cannot miss the big glass entrance.",
                  hints: ["Thank you very much, Maina.", "Asante sana!"]
                };
              } else {
                return {
                  speaker: "Passerby Maina",
                  text: "Karibu sana! Enjoy your walk in town, and stay safe.",
                  hints: ["Have a wonderful day.", "Goodbye!"]
                };
              }
            }
          },
          2: {
            opening: "Hello there. Can I help point you in the right direction?",
            hints: ["Yes please, I am looking for the post office.", "How do I get to Kenyatta Avenue?", "Is the supermarket nearby?"],
            branch: (input, turn) => {
              return {
                speaker: "Passerby Maina",
                text: "Cross at the pedestrian zebra crossing, turn right at the bank, and continue two blocks forward.",
                hints: ["Turn right at the bank, then two blocks?", "Is it a far walk on foot?", "Thank you!"]
              };
            }
          },
          3: {
            opening: "Hello! If you are heading towards City Hall, please note that the main road is closed for a public marathon event.",
            hints: ["Which alternative walking path is open?", "Can I walk through the parliament gardens?", "How do I get around it?"],
            branch: (input, turn) => {
              return {
                speaker: "Passerby Maina",
                text: "Take the paved pedestrian walkway through Uhuru Park instead. It is peaceful and avoids all the crowd barricades.",
                hints: ["Thank you, that sounds much calmer.", "Is Uhuru Park walkway open now?"]
              };
            }
          },
          4: {
            opening: "Hello! Are you looking for the bus stop or the train terminal?",
            hints: ["I am looking for the train terminal.", "I am looking for the bus station."],
            branch: (input, turn) => {
              if (turn === 0) {
                return {
                  speaker: "Shopkeeper Amina",
                  text: "Mambo! If it's the train station, be aware the footbridge is crowded right now. Use the lower road.",
                  hints: ["Thank you, which lower road?", "Is the lower road easy to walk on?"]
                };
              } else {
                return {
                  speaker: "Passerby Maina",
                  text: "Yes, mama is correct! Follow Haile Selassie Avenue along the sidewalk. It leads straight to the main gate.",
                  hints: ["Thank you both for guiding me.", "Asante sana!"]
                };
              }
            }
          }
        }
      }
    };

    /**
     * INITIALIZATION & LIFECYCLE
     */


export async function generateAIResponse(userMessage, conversationHistory, scenario, level, conversationTurn) {
  const scenarioData = SCENARIOS[scenario];
  if (!scenarioData || !scenarioData.levels[level]) {
    return {
      speaker: 'Companion',
      text: 'I hear you clearly. Let us continue practising at your pace.',
      hints: ['Thank you.', 'Could you repeat that?'],
    };
  }

  const branchFunction = scenarioData.levels[level].branch;
  return branchFunction(userMessage, conversationTurn);
}
