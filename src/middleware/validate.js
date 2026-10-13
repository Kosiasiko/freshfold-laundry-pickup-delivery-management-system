const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return res.status(400).json({
      status: 'fail',
      errors: result.error.issues.map((i) => ({
        field: i.path.slice(1).join('.'),
        message: i.message,
      })),
    });
  }

  req.body = result.data.body ?? req.body;
  next();
};

export default validate;