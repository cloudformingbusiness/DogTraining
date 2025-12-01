import bcrypt from "bcrypt";

const password = "test1234";
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then((hash) => {
  console.log("Hash für test1234:", hash);
});
