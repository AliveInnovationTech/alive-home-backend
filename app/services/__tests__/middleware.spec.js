// const request = require("supertest");

describe("dummy test", () =>{
    it("Should return true", () => {
        expect(true).toBe(true) ;
    });
});
// const express = require("express");
// const app = express();
// const { checkcar } = require("../middleware/dataChecks");
// app.use(express.urlencoded({ extended: false }));
// app.use("/", checkcar);

// test("middle ware should work", done => {
//     request(app)
//         .post("/")
//         .type("form")
//         .send({ amount: "100000" })
//         .expect("Content-Type", /json/)
//         .expect({ success: true })
//         .expect(200, done);
// });
//
// test("Amount lower that 1,000,000 should throw error", done => {
//     request(app)
//         .post("/")
//         .type("form")
//         .send({ amount: "10000" })
//         .expect("Content-Type", /json/)
//         .expect({
//             success: false, message: "Value must be greater than 1 million naira"
//         })
//         .expect(400, done);
// });
