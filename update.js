// populateAddress.js
const mongoose = require('mongoose');
const User = require('./models/User'); // adjust path if needed

// helper function to generate a random address
function generateRandomAddress(user) {
  const streets = ["Main St", "Broadway", "Maple Ave", "Oak St", "Cedar Rd", "Highland Dr"];
  const cities = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Kano", "Enugu"];
  const states = ["Lagos", "FCT", "Oyo", "Rivers", "Kano", "Enugu"];

  const streetNumber = Math.floor(Math.random() * 200) + 1;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];

  return `${streetNumber} ${street}, ${city}, ${state}, Nigeria`;
}

mongoose.connect('mongodb://127.0.0.1:27017/school-eccomerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log("✅ Connected to DB");

  // Find users without an address
  const users = await User.find({ address: { $exists: false } });

  for (let user of users) {
    user.address = generateRandomAddress(user);
    await user.save();
    console.log(`➡️ Updated user ${user._id} with address: ${user.address}`);
  }

  console.log(`✅ Finished updating ${users.length} users`);
  mongoose.connection.close();
})
.catch(err => {
  console.error("❌ DB Connection Error:", err);
});
