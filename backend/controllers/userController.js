import { getUser as getUserService, createUser as createUserService, updateUser as updateUserService } from "../services/userService.js ";

export const getUser = async (req, res) => {
  const { userId } = req.params;
  const user = await getUserService(userId);
  res.json(user);
};

export const createUser = async (req, res) => {
  const { userId, settings } = req.body;
  const user = await createUserService(userId, settings);
  res.json(user);
};

export const updateUser = async (req, res) => {
  const { userId, settings } = req.body;
  const user = await updateUserService(userId, settings);
  res.json(user);
};

export const deleteUser = async (req, res) => {
  const { userId } = req.params;
  const user = await deleteUserService(userId);
  res.json(user);
};

