export interface IUser {
  id: string;
  email: string;
  role: "admin" | "student" | "evaluator";
}
